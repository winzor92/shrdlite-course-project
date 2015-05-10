/// <reference path="collections.ts" />

module AStar {
	
	/**
 	* Class for representing a node in a the graph
 	*/
	export class Nod { 
		
		private id     	 : string;		// The name of the node
		private cValue 	 : number;		// current path cost to this node
		private f_score  : number;		// cost + heuristic
		private arches 	 : Arc[] = [];	// a list of the arches connected to nearBy nodes
		private cameFrom : Nod;			// a reference to the previous node
	
		constructor (id:string) {
			this.id		= id;
			this.cValue = 0; 
			this.arches = [];	
		}
		
		public getArcList(){
			return this.arches;
		}
		
		public setArcList(list : Arc[] ){
			this.arches = list;
		}
		
		// gets the requested nearby node's arc cost
		public getEndNod(nod : Nod) : number {
			for (var i = 0; i < this.arches.length; i++) {
	    		if (this.arches[i].getArcNode().getid() == nod.getid() ){
	    			return this.arches[i].getArcCost();
	    		}
			}
		}
		
		public getid() : string {
			return this.id;
		}
	
		public setid(value : string) : void {
		    this.id = value;
		}
		
		public getCameFrom(): Nod {
			return this.cameFrom;
		}
		
		public setCameFrom(nod : Nod) : void {
	    	this.cameFrom = nod;
		}
		
		public getCValue(): number {
			return this.cValue;
		}
		
		public setCValue(value : number) : void {
		    this.cValue = value;
		}
		
		public getf_score(): number {
			return this.f_score;
		}
		
		public setf_score(value : number) : void {
		    this.f_score = value;
		}
		
		public toString() : string {
			return this.id;
		}  
	}
	
	/**
	*	Class to represent a Arc
	**/
	export class Arc {
		private cost : number;	// cost value
		private aNod : Nod;		// a node that the arc points to
		
		constructor (cost:number, aNod : Nod){
			this.cost = cost;
			this.aNod = aNod;	
		}
		public getArcCost() : number{
			return this.cost
		}
		public getArcNode() : Nod {
			return this.aNod;
		}
	}
	
	/**
	*	Build the path after we found the goal
	**/
	export function getPath(startNod : Nod, nod : Nod ) : string[]{
		var pathList : string[] = [];
		var i : number = 0 ;
		var cost : number = nod.getCValue();
		while (nod.getCameFrom() != null){
			pathList[i] = nod.getid();
			nod = nod.getCameFrom();
			i++;
		}
		pathList[pathList.length] = "<br> The Path: " + startNod.getid();
		pathList[pathList.length] = "The cost of the total path: " + cost;
		pathList[pathList.length] ="";
		return pathList.reverse();
	}
	
	/**
	*	The A* function that take: list of nodes, start node, Goal node and heuristic function
	**/
	export function runAStar(graph : Nod[] , startNode : Nod, goal : Nod, h) : string[] {
		
		var frontier = new collections.PriorityQueue<Nod>(function (a :Nod, b :Nod)	{	//frontier as a priority queue, sorted on lowest f score
					return b.getf_score() - a.getf_score();});
	
		var haveSeen = new collections.Set<Nod>(); 	// Set to remember if we have calculated this node before
		
		startNode.setf_score(0 +h(startNode.getid()) ); // Set the f score to 0 + the heuristic value (it's cost is 0 from start)
		frontier.add(startNode );
	
		while ( !frontier.isEmpty()){
			var current : Nod = frontier.dequeue();
			if (current == goal){
				  var a = getPath (startNode, current);	//return the path if we found the goal
					a[0]="Number of visited nodes " +haveSeen.size() + " ";
					a[1]="<br>" + a[1];				
				return a;
			}
	
			haveSeen.add(current);
	a
			for (var i = 0 ; i < current.getArcList().length;  i++) {		//iterate through all the nearby nodes of the current node
				var chooseNearBy : Boolean;							//Boolean to deside if we should update nearby node
				var nearBy : Nod = current.getArcList()[i].getArcNode();
				if (haveSeen.contains(nearBy)){						//if we already calculated this node pick the next
					continue;
				}
				var tempCost : number = current.getCValue() + current.getEndNod(nearBy);	//calculate current cost + the Arc cost the the nearby node
		
				if (!(frontier.contains (nearBy))){		//add the node to frontier if it's not there
					frontier.add(nearBy);
					chooseNearBy = true;
				} else if (tempCost < nearBy.getCValue()){
					chooseNearBy = true;
				} else{
					chooseNearBy = false;
				}
				
				if(chooseNearBy){	//if nearby is better then update current cost and previous node and the f score of the node
					nearBy.setCameFrom (current);
					nearBy.setCValue(tempCost);
					nearBy.setf_score (nearBy.getCValue() + h(nearBy.getid()) );
				}
			}
		}
		return ["No path was found"];
	}
}