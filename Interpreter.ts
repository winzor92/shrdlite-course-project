///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="collections.ts"/>

module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    export function interpret(parses : Parser.Result[], currentState : WorldState) : Result[] {
        var interpretations : Result[] = [];
        parses.forEach((parseresult) => {
            var intprt : Result = <Result>parseresult;
            intprt.intp = interpretCommand(intprt.prs, currentState);
            interpretations.push(intprt);
        });
        if (interpretations.length==1) {
            return interpretations;
        }
        else if(interpretations.length>1){
        	var err = new Interpreter.ClariQuest(makeClariQuest(interpretations));
        	err.interp = interpretations; 
        	throw err;
        }else {
            throw new Interpreter.Error("Found no interpretation");
        }
    }


    export interface Result extends Parser.Result {intp:Literal[][];}
    export interface Literal {pol:boolean; rel:string; args:string[];}


    export function interpretationToString(res : Result) : string {
        return res.intp.map((lits) => {
            return lits.map((lit) => literalToString(lit)).join(" & ");
        }).join(" | ");
    }

    export function literalToString(lit : Literal) : string {
        return (lit.pol ? "" : "-") + lit.rel + "(" + lit.args.join(",") + ")";
    }


    export class Error implements Error {
        public name = "Interpreter.Error";
        constructor(public message? : string) {}
        public toString() {return this.name + ": " + this.message}
    }
    
     export class ClariQuest implements Error {
        public name = "ClariQuest.Error";
        public interp : Result [] = [];
        constructor(public message : string) {}
        public toString() {return this.message}
    }
    
    
	function makeClariQuest(interps : Result[]) : string {
		var uniqueString = new collections.Set<string>();
    	for(var i = 0; i < interps.length; i++){
    		for(var j = 0; j < interps.length; j++){
    			
    			
    			if(i != j){
    				uniqueString.add(cmpObj(interps[i].prs.ent.obj, interps[j].prs.ent.obj, ""));
    				uniqueString.add(cmpObj(interps[i].prs.loc.ent.obj, interps[j].prs.loc.ent.obj, ""));
    			}
    		}
    	}
    	uniqueString.remove("");
    	var array = uniqueString.toArray();
    	for(var i=0; i<array.length; i++){
    		array[i] = i + " " + array[i];
    	}
    	
    	return "Did you mean: " + array.toString();
    }

	function cmpObj (fstObj : Parser.Object, sndObj : Parser.Object, objPath : string) : string {
		var fst : boolean = false;
		var fstObjLoc : boolean = false;
		
		var snd : boolean = false;
		var sndObjLoc : boolean = false;
		
			if (fstObj.obj){fst = true;}
			
			if (sndObj.obj){snd = true;}
			
			if(snd != fst){
				if(fst){
					objPath += getRestOfPath(fstObj,objPath);					
				}else{
					objPath += getRestOfPath(sndObj,objPath);
				}
			}else if (fst){
					objPath+= cmpObj(fstObj.obj, sndObj.obj, objPath);
			}	
		return objPath;
	}
	
	function getRestOfPath (obj : Parser.Object, path : string){
		if(obj.obj || obj.loc){
			
			if(obj.obj){path += getRestOfPath(obj.obj, path);}
			if (obj.loc){
				path += " " + obj.loc.rel + " " + obj.loc.ent.quant;
				path+= getRestOfPath(obj.loc.ent.obj, "");
			}
		}else{path += objectToString(obj);}

		return path; 
	}
	
	function objectToString (obj : Parser.Object) : string{
		var str : string ="";
		
		if(obj.size){str = str + " " + obj.size}
		if(obj.color){str = str + " " + obj.color}
		if(obj.form){str = str + " " + obj.form}
		
		return str;
	}

    //////////////////////////////////////////////////////////////////////
    // private functions

    function interpretCommand(cmd : Parser.Command, state : WorldState) : Literal[][] {
        // This returns a dummy interpretation involving two random objects in the world
        var objs : string[] = Array.prototype.concat.apply([], state.stacks);
        var a = objs[getRandomInt(objs.length)];
        var b = objs[getRandomInt(objs.length)];
        var intprt : Literal[][] = []
        
        if (cmd.cmd == "move"){
        	intprt = goalsToPDDL(cmd.ent, cmd.loc, state);
        }else if(cmd.cmd == "take"){
        	intprt = goalsToPDDL(cmd.ent, null, state);
        }else if(cmd.cmd == "put"){
	    var o : ObjectDefinition = state.objects[state.holding];
	    intprt = goalsToPDDL({quant:"holding", obj:o},cmd.loc,state);
        }
        console.log("interpreter--------------", intprt);
        return intprt;
    }
    
    class position {
    	public x : number;
    	public y : number;
    	public obj : ObjectDefinition;
    	public name : string; 
	
    	constructor( x : number, y : number, obj : ObjectDefinition, name : string){
    		this.x = x;
    		this.y = y;
    		this.obj = obj;
    		this.name = name; 
    	}
    }
    
    function checkHolding(obj : Parser.Object, holding : Parser.Object){
    	if((obj.form === null || obj.form === holding.form) && (obj.color === null || obj.color === holding.color) && (obj.size === null  || obj.size === holding.size)){
    		return true
    	}else{
    		return false;
    	}
    	
    }
    

    
    function goalsToPDDL(ent : Parser.Entity , loc : Parser.Location , state : WorldState) : Literal[][] {
    	var lits : Literal[][] = [];
    	var posList : position[] = [];
    	
    	if(ent.quant == "holding" || state.holding !=null && checkHolding(ent.obj, state.objects[state.holding])){
    		var object1 = state.objects[state.holding];
    		posList =  [new position(0,0,{form: object1.form, color: object1.color, size: object1.size}, state.holding)];
    	}else{
    		posList = checkStm (ent.obj, state);
    	}
    	console.log("Entity-----------", posList);
    	for(var i =0; i< posList.length;  i++){
    		if(loc == null){
    			var hold : Literal = {pol : true, rel : "holding", args : [posList[i].name]};
    			lits.push([hold]);
    		}else{
    			var goal = [];
    			if (state.holding !=null && checkHolding(loc.ent.obj, state.objects[state.holding])){
    				var object2 = state.objects[state.holding];
    				goal.push(new position(0,0,{form: object2.form, color: object2.color, size: object2.size}, state.holding));
    			}else{
    				goal = checkStm (loc.ent.obj, state);	
    			}
    			
    			
    			
    			console.log("Location-----------", goal);
    			for(var j =0; j< goal.length;  j++){
    				if(loc.rel == "ontop"){
    					var g : Literal = {pol : true, rel : "ontop", args : [posList[i].name, goal[j].name ]};
    					if(checkValidPos(posList[i].obj, goal[j].obj )){
    						lits.push([g]);
    					}
    				}else if(loc.rel == "inside"){
    					var	a : Literal = {pol : true, rel : "inside", args : [posList[i].name, goal[j].name ]};
    					if(checkValidPos(posList[i].obj, goal[j].obj )){
    						lits.push([a]);
    					}
    				}else if(loc.rel == "above"){
                        var b : Literal = {pol : true, rel : "above", args : [posList[i].name, goal[j].name ]};
                            lits.push([b]);                     
                    }else if(loc.rel == "under"){
                        var b : Literal = {pol : false, rel : "above", args : [posList[i].name, goal[j].name ]};
                            lits.push([b]);                    
                    }else if(loc.rel == "beside"){
                        var a : Literal = {pol : true, rel : "beside", args : [posList[i].name, goal[j].name ]};
                            lits.push([a]);
                            
                    }else if(loc.rel == "leftof"){
                        var a : Literal = {pol : true, rel : "leftof", args : [posList[i].name, goal[j].name ]};
                            lits.push([a]);
                            
                    }else if(loc.rel == "rightof"){
                        var a : Literal = {pol : false, rel : "leftof", args : [posList[i].name, goal[j].name ]};
                            lits.push([a]);
                    }
    			}	
    		}
    	}
    	
    	
    	return lits;
    }

    // Returns which height the object have in the given stack 
    export function searchStack (stack : string[], obj : string ) : number {
        for(var i =0; i< stack.length;  i++){
            if(obj == stack[i]){
                return i;
            }
        }
        return -1;
    }
        
    function checkStm (objs : Parser.Object , state : WorldState) : position[] {
    	var list : position[] = [];
    	
    	if(objs.obj){
    		var stmObj = checkStm(objs.obj, state);
    		var stmLocObj = checkStm(objs.loc.ent.obj, state);
    	   	
    	   	for(var i =0; i< stmLocObj.length;  i++){	//for every loc obj check every stm obj
    	   	
				if( objs.loc.rel == "ontop" || objs.loc.rel == "inside"){
					for(var j =0; j< stmObj.length;  j++){		//loops through every stmObject to check all objects matching with stmLocobj 
						if(!(stmLocObj[i].y+1 > state.stacks[stmLocObj[i].x].length) && 
							(state.stacks[stmLocObj[i].x][stmLocObj[i].y+1] == state.stacks[stmObj[j].x][stmObj[j].y])){
					
							list.push(stmObj[j]);
						}
					}
				}else if( objs.loc.rel == "above"){
                    for(var j =0; j< stmObj.length;  j++){      //loops through every stmObject to check all objects matching with stmLocobj 

                        //Which height the object have in the given stack
                        var objHeight : number = searchStack (state.stacks[stmLocObj[i].x],state.stacks[stmObj[j].x][stmObj[j].y]);  
                        //check same x-cordinate && check that y-cordinate is greater
                        if((stmLocObj[i].x == stmObj[j].x) && (objHeight > stmLocObj[j].y)) {                            
                            list.push(stmObj[j]);
                        }
                    }
                }else if( objs.loc.rel == "under"){
                    for(var j =0; j< stmObj.length;  j++){      //loops through every stmObject to check all objects matching with stmLocobj 

                        //Which height the object have in the given stack
                        var objHeight : number = searchStack (state.stacks[stmLocObj[i].x],state.stacks[stmObj[j].x][stmObj[j].y]);  
                        
                        //check same x-cordinate && check that y-cordinate is lower
                        if((stmLocObj[i].x == stmObj[j].x) && (objHeight < stmLocObj[j].y)) {                            
                            list.push(stmObj[j]);
                        }
                    }
                }else if(objs.loc.rel == "beside"){
                    for(var j =0; j< stmObj.length;  j++){
                        var stack1 = searchStack(state.stacks[stmLocObj[i].x-1], state.stacks[stmObj[j].x][stmObj[j].y]);
                        var stack2 = searchStack(state.stacks[stmLocObj[i].x+1], state.stacks[stmObj[j].x][stmObj[j].y]);
                        if(stack1 != -1){
                            list.push(stmObj[j]);
                        }else if(stack2 != -1){
                            list.push(stmObj[j]);
                        }
                    }
                }else if(objs.loc.rel == "leftof"){
                	for(var j =0; j< stmObj.length;  j++){
	                	for(var t =0; t < stmLocObj[i].x; t++){
	                		var stack = searchStack(state.stacks[t], state.stacks[stmObj[j].x][stmObj[j].y]);
	                		if (stack != -1){
	                			list.push(stmObj[j]);
	                		}
	                	}
	                }
                }else if(objs.loc.rel == "rightof"){
                	for(var j =0; j< stmObj.length;  j++){
	                	for(var t =stmLocObj[i].x; t < state.stacks.length; t++){
	                		var stack = searchStack(state.stacks[t], state.stacks[stmObj[j].x][stmObj[j].y]);
	                		if (stack != -1){
	                			list.push(stmObj[j]);
	                		}
	                	}
	                }
                }
			}		
    	} else {
    		
    		if (objs.form == "floor"){
    			for(var x =0; x< state.stacks.length;  x++){
    				list.push(new position(x,-1, {form : "floor", size : "none" , color : "none"}, "floor"));
    			}
    			
    	    }else{
	    	    for(var x =0; x< state.stacks.length;  x++){
		    		for (var y=0; y< state.stacks[x].length; y++){
		    			var index = state.stacks[x][y];
		    			if((objs.color == null || objs.color == state.objects[index].color) && 
		    				(objs.form == null || objs.form=="anyform" || objs.form == state.objects[index].form)  && 
		    				(objs.size == null || objs.size == state.objects[index].size)){
		    
		    				var pos = new position(x,y, state.objects[state.stacks[x][y]], state.stacks[x][y]);
		    				list.push(pos);
		    			}
	    			}
	    		}
			}						
    	}
        return list;
    }
    


    function getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    /**
    *   Check that the combination of over and under object is valid 
    **/
    export function checkValidPos (over : ObjectDefinition, under : ObjectDefinition): boolean{
        
        //Everything can be on a floor
        if (under.form == "floor"){
            return true;
        }
        //A ball can only be in a box of the correct size (except floor)
        else if(over.form == "ball" && under.form == "box"){
                return checkSizeUGE(over.size, under.size);
        }
        // A ball can only be in a box, which is already tested therefore it is false
        else if(over.form == "ball"){
            return false;
        }       
        //Boxes cannot contain pyramids, planks or boxes of the same size.
        else if(under.form =="box"){
            if(over.form == "table" || over.form == "brick"){
                return checkSizeUGE(over.size, under.size);  
            }else if(over.form == "plank" || over.form == "pyramid"){
                return checkSizeUG(over.size, under.size);
            }else{
                return checkLessEQ(over.size, under.size);
            }
        }
        // Large Box cant be over large Pyramid
        // Small Box cant be over small Pyramid 
        else if(under.form == "pyramid"){
            if (over.form == "box"){
                return checkSizeUG(over.size, under.size);
            }else{
                return checkSizeUGE(over.size, under.size);
            }
        }
        // Small Box cant be over small Brick
        else if(under.form == "brick"){
            if (over.form == "box"){
                return under.size == "large";
            }else{
                return checkSizeUGE(over.size, under.size);
            }
        }
        //Table or plank
        else if (under.form == "table" || under.form == "plank"){
            return checkSizeUGE(over.size, under.size);
        }
        return false;
    }

    /**
    * checks that over is of same size or smaller than under.
    **/
    function checkSizeUGE (over : string, under : string): boolean {
        if(under == "large"){
            return true;
        }else if(over =="small"){
            return true;
        }else{
            return false;
        }
    }

    /**
    * checks that over is of same size or smaller than under.
    **/
    function checkSizeUG (over : string, under : string): boolean {
        if(under == "large" && over == "small"){
            return true;
        }else{
            return false;
        }
    }

    function checkLessEQ (over : string, under : string): boolean {
        if(under == "large" && over == "small" || under == "small" && over == "small"){
            return true;
        }else{
            return false;
        }
    }
}