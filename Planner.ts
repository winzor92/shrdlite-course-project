///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="AStar.ts"/>

module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    export function plan(interpretations : Interpreter.Result[], currentState : WorldState) : Result[] {
        var plans : Result[] = [];
        interpretations.forEach((intprt) => {
            var plan : Result = <Result>intprt;
            console.log ("worldToPPDL-----------------------",worldToPPDL(currentState));
            console.log ("Worldstate-----------------------",currentState);
            console.log ("parentState-----------------------",createMoves(currentState));
            
            plan.plan = planInterpretation(plan.intp, currentState);
            plans.push(plan);

        });
        if (plans.length) {
            return plans;
        } else {
            throw new Planner.Error("Found no plans");
        }
    }


    export interface Result extends Interpreter.Result {plan:string[];}


    export function planToString(res : Result) : string {
        return res.plan.join(", ");
    }


    export class Error implements Error {
        public name = "Planner.Error";
        constructor(public message? : string) {}
        public toString() {return this.name + ": " + this.message}
    }


    //////////////////////////////////////////////////////////////////////
    // private functions
    
	
	//Adds nearby child nodes to current node
	export function addNearbyNodes(current : AStar.Nod){
		createNodes (current ,createMoves(current.getWorldState()));
	}

	function createNodes(current : AStar.Nod, parent: WorldState[]) : void{
		var nodeList : AStar.Arc[] = [];
		for(var x =0; x<parent.length; x++ ){
			if(parent[x] != null){
				if(x == 0){
					nodeList.push (new AStar.Arc (1, new AStar.Nod( "", parent[0], "r")));
				}else if(x == 1){
					nodeList.push (new AStar.Arc (1, new AStar.Nod( "", parent[1], "l")));
				}else if(x == 2){
					nodeList.push (new AStar.Arc (1, new AStar.Nod( "", parent[2], "p")));
				}else if(x == 3){
					nodeList.push (new AStar.Arc (1, new AStar.Nod( "", parent[3], "d")));
				}
			}	
		}
		current.setArcList(nodeList);
	}

	function createMoves(parent: WorldState) : WorldState[]{
			
			var ans : WorldState[]=[];
			
			//
			var rState = copyParent(parent);
			var lState = copyParent(parent);
			var pState = copyParent(parent);
			var dState = copyParent(parent);
			
			//cant go right
			if(parent.arm == parent.stacks.length -1){
				rState = null;
			}else{
				rState.arm +=1;	
			}
			//cant go left
			if(parent.arm == 0){
				lState = null;
			}else{
				lState.arm -=1;	
			}
			// cant pick up if stack is empty or allready holdning
			if(parent.holding != null || parent.stacks[parent.arm].length == 0){
				pState = null;
			}else{
				pState.holding = pState.stacks[parent.arm].pop();
			}
			// can i drop here check if legal to move
			if(parent.holding == null || parent.stacks[parent.arm].length != 0 && !(Interpreter.checkValidPos (parent.objects[parent.holding],parent.objects[parent.stacks[parent.arm][dState.stacks[parent.arm].length-1] ]))){
				dState = null;
			}else{
				dState.stacks[parent.arm][dState.stacks[parent.arm].length]=dState.holding;
				dState.holding = null;
			}
			ans.push(rState, lState, pState, dState);
			return ans;
		}

	// copy parent PDDL to Create new object PDDL
	function copyParent (parent:WorldState) : WorldState{
		var lits : string [][]=[];
		for(var x =0; x<parent.stacks.length; x++ ){
			var lit : string[] = [];
			for(var y =0; y<parent.stacks[x].length; y++ ){
				lit.push(parent.stacks[x][y]);
			}
			lits.push(lit);
		}
		
		return {stacks : lits, holding : parent.holding, arm : parent.arm , objects : parent.objects ,examples : parent.examples };
	} 
	
	

    
    //coverts worldstate to ppdl
    export function worldToPPDL (state : WorldState) : Interpreter.Literal[][] {
    	var lits : Interpreter.Literal[][] = [];
    	var leftof : string[] = [];
		for(var x =0; x<state.stacks.length; x++ ){
			var tmp : string [] = [];
			for(var y =0; y<state.stacks[x].length; y++ ){
				if(y == 0){
					lits.push([{pol : true, rel : "ontop", args : [state.stacks[x][0], "floor" ]}]);
				}else{
					if(state.objects[state.stacks[x][y-1]].form == "box"){
						lits.push([{pol : true, rel : "inside", args : [state.stacks[x][y], state.stacks[x][y-1] ]}]);
					}else{
						lits.push([{pol : true, rel : "ontop", args : [state.stacks[x][y], state.stacks[x][y-1] ]}]);
					}
				}

				//Adds a ppdl for all the objects that is above every object
				for(var z = y+1; z<state.stacks[x].length; z++ ){
					lits.push([{pol : true, rel : "above", args : [state.stacks[x][z], state.stacks[x][y] ]}]);
				}

				//Adds a ppdl for all the objects left of the each stack
				for(var i =0; i<leftof.length; i++ ){
					lits.push([{pol : true, rel : "leftof", args : [leftof[i] , state.stacks[x][y]]}]);
				}
				tmp.push(state.stacks[x][y]);
			
				//Adds a ppdl for all the objects next to each stack
				for(var z = x-1; z<x+2; z++ ){
					if(z >= 0 && z!=x && z <= state.stacks.length-1){
						lits = lits.concat(addBesideStack(state.stacks[z] , state.stacks[x][y]));
					}
				}				
			}
			leftof = leftof.concat(tmp);
		}
		
		lits.push([{pol : true, rel : "arm", args : ["" + state.arm, "" + state.stacks.length ]}]);
		if(state.holding == null){
			lits.push([{pol : false, rel : "holding", args : [state.holding] }]);
		}else{
			lits.push([{pol : true, rel : "holding", args : [state.holding] }]);
		}

    	return lits;
    }
    //adds beside on every element in a specific stack
    function addBesideStack (stackToAdd : string[], currObjstr : string){
    	var tmpLits : Interpreter.Literal[][] = [];
    	for(var y =0; y<stackToAdd.length; y++ ){
    		tmpLits.push([{pol : true, rel : "beside", args : [stackToAdd[y] ,currObjstr ]}]);
    	}
    	return tmpLits;
    }
    
    function heuristicFunc(state : WorldState , goal : Interpreter.Literal[][] ) : number{
    	var tar : number = -1;
    	var tarIndex : number =  -1;
    	var loc : number = -1;
    	var locIndex : number =  -1;
    	var minimum : number = Number.MAX_VALUE;
    	var list : number[] = [];
    	var findTar : number = -1;
    	
    	for(var i =0; i<goal.length; i++ ){
    		for(var x =0; x<state.stacks.length; x++ ){
				var stackTar = Interpreter.searchStack(state.stacks[x], goal[i][0].args[0]);
				var stackLoc = Interpreter.searchStack(state.stacks[x], goal[i][0].args[1]);
				
				if( goal[i][0].args[0] == state.holding){
					tar =0 ; 
					tarIndex = state.arm;
					findTar =0;
				}
				
				if( goal[i][0].args[1] == state.holding){
					loc =0 ;
					locIndex = state.arm;
					findTar =0;
				}

				if(stackTar != -1){
					// It takes atleast four times of the number of objects over an object minus one get it highest in the stack
					tar = (((state.stacks[x].length-1) - stackTar)*4)-1; 
					tar = tar < 0 ? 0 : tar;
					tarIndex = x;
				}
				
				if(stackLoc != -1){
					loc = (((state.stacks[x].length-1) - stackLoc)*4)-1;
					loc = loc < 0 ? 0 : loc;
					locIndex = x;
				}
			}
			var tmpTot = 0;
			if(goal[i][0].rel == "holding"){
				tmpTot = tar;
				
			}else if(goal[i][0].rel == "above" && goal[i][0].pol){
				tmpTot = tar +  Math.max(tarIndex , locIndex)- Math.min(locIndex , tarIndex) + findTar;
				
			}else if(goal[i][0].rel == "above" && goal[i][0].pol == false){
				tmpTot = loc +  Math.max(tarIndex , locIndex)- Math.min(locIndex , tarIndex) + findTar;
				
			}else{
				tmpTot = tar + loc +  Math.max(tarIndex , locIndex)- Math.min(locIndex , tarIndex) + findTar;
			}
			
			if(findTar == -1){
				tmpTot += (Math.max (tarIndex,  state.arm) - Math.min (tarIndex,  state.arm));
			}
				
			if(minimum > tmpTot){
				minimum = tmpTot;
			}
		}
    	return minimum;
    }

    function planInterpretation(intprt : Interpreter.Literal[][], state : WorldState) : string[] {
		var plan : string[] = [];
		var plan2 : string[] = [];
		if(intprt.length == 0){
			return ["no matching objects"];
		}else if(!AStar.checkGoal(worldToPPDL(state), intprt )){
			//plan2 = AStar.runAStar([], new AStar.Nod("",state,""), intprt , function ret(){return true;} );
			//var n = plan2.search(",");
			//var s = plan2[0].slice(23,plan2[0].length-1);	

			plan = AStar.runAStar([], new AStar.Nod("",state,""), intprt , heuristicFunc);
		//	plan[0]="Number of node without Heuristics " + s + " , \n" + plan[0];		
		}else{
			plan = ["Goal already found"];
			console.log("error-------------------------------------");
		}
		console.log("plan-------------------------------------", plan);
		console.log("intprt-------------------------------------", intprt);
		
		return plan;
    }


    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

}
