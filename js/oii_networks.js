$( document ).ready(function() {
	'use strict';
	//Load config	
	var oii={};
	oii.config = function(url, callback) {
		var xhr = sigma.utils.xhr();

		if (!xhr)
			throw 'XMLHttpRequest not supported, cannot load the file.';

		xhr.open('GET', "config.json", true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				//do something
				var config=JSON.parse(xhr.responseText);
				if (callback) callback(config);
			}
		};
		xhr.send();
	};	
	
	// Add a method to the graph model that returns an
	// object with every neighbors of a node inside:
	sigma.classes.graph.addMethod('neighbors', function(nodeId) {
		var k,
			neighbors = {},
			index = this.allNeighborsIndex[nodeId] || {};
	
		for (k in index)
		  neighbors[k] = this.nodesIndex[k];

		return neighbors;
	});
	
	sigma.classes.graph.addMethod('inNeighbors', function(nodeId) {
		var k,
			neighbors = {},
			index = this.inNeighborsIndex[nodeId] || {};
	
		for (k in index)
		  neighbors[k] = this.nodesIndex[k];

		return neighbors;
	});
	
	sigma.classes.graph.addMethod('outNeighbors', function(nodeId) {
		var k,
			neighbors = {},
			index = this.outNeighborsIndex[nodeId] || {};
	
		for (k in index)
		  neighbors[k] = this.nodesIndex[k];

		return neighbors;
	});

	function graph_setup(s) {
		console.log("Setting up the graph");
		var filter = new sigma.plugins.filter(s); //Filters API
		// We first need to save the original colors of our
		// nodes and edges, like this:
		s.config={};
		s.clusters={};
		s.graph.nodes().forEach(function(n) {
			n.originalColor = n.color;
			if (! (n.color in s.clusters)) {
				s.clusters[n.color]=[];
			}
			s.clusters[n.color].push(n.id);
		});
	
		s.graph.edges().forEach(function(e) {
			e.originalColor = e.color;
		});
		
		//OLD: now in sigma itself -- define degree_sum, indegree_sum, and outdegree_sum for each node
		

		// When a node is clicked, we check for each node
		// if it is a neighbor of the clicked one. If not,
		// we set its color as grey, and else, it takes its
		// original color.
		// We do the same for the edges, and we only keep
		// edges that have both extremities colored.
		
		//TODO: This code has to be updated to work with the Filters Plugin
		var emph=function (obj) {obj.hidden=false;};
		var unemph=function (obj) {obj.hidden=true;};
		if (oii.config.features.clickBehavior) {
			if (oii.config.features.clickBehavior==="dim") {
				emph=function (obj) {obj.color = obj.originalColor;};
				unemph=function (obj) {obj.color = '#aaa';};
			}
		}
			
		
		
		var highlightNode=function(nodeId) {
			var toKeep = s.graph.neighbors(nodeId); //object/dict with full node objects
			toKeep[nodeId] = true; //SAH -- example code had entire node object here
			var action = $("#click_action select").val();
			
			var neighbors=new Array(toKeep.length);
			var nodeObj=false;
			
			var outgoingEdges=new Array();
			var incomingEdges=new Array();

			var outgoingEdgeHTML=new Array();
			var incomingEdgeHTML=new Array();
				
			s.graph.nodes().forEach(function(n) {
				if (toKeep[n.id]) {
					if (nodeObj===false && nodeId==n.id) {
						//TODO: Force label of this node to be printed (this is focal node)
						//Not possible? -- see force_labels.js
						nodeObj=n;
					} else {
						//TODO: separate out direction of links if specificed in config (incoming, outgoing, mutual)
						neighbors.push('<li class="node" data-id="'+n.id+'"><a href="javascript:void(0);">'+n.label+'</a></li>');
					}
				}
			});

			s.graph.edges().forEach(function(e) {
				if (e.source==nodeId) {
					outgoingEdges.push(e);
					outgoingEdgeHTML.push('<li class="node" data-id="'+e.target+'"><a href="javascript:void(0);">'+e.target+'</a> ('
						+ e["size"] + ')</li>');
				} 
				if (e.target==nodeId) {
					incomingEdges.push(e);
					incomingEdgeHTML.push('<li class="node" data-id="'+e.source+'"><a href="javascript:void(0);">'+e.source+'</a> ('
						+ e["size"] + ')</li>');
				}
			});
			
			var nodeSizes=new Object();
			var keepEdges=new Object();
			var vals=$('#slider-range').slider("option", "values");
			if ("both"==action || "source"==action) {
				outgoingEdges.forEach(function(e) {
				keepEdges[e.id]=true;
				nodeSizes[e.target]=e["size"];
				});
			} 
			if ("both"==action || "target"==action) {
				incomingEdges.forEach(function(e) {
					keepEdges[e.id]=true;
					if (e.source in nodeSizes) {
						nodeSizes[e.source]+=e["size"];
					} else {
						nodeSizes[e.source]=e["size"];
					}
				});
			}
			
			filter.undo('neighbor-nodes').neighborsOf(nodeId,'neighbor-nodes').apply();
			filter.undo('neighbor-edges').edgesBy(function(e) {
				/*return (("both"==action || "target"==action) && e in incomingEdges) ||
					(("both"==action || "source"==action) && e in outgoingEdges)
				*/
				return (e.id in keepEdges);
			},'neighbor-edges').apply();
			
			nodeSizes[nodeId]=1000; //Source node gets constant
			s.graph.nodes(Object.keys(nodeSizes)).forEach(function(n) {
				var size=Math.sqrt(nodeSizes[n.id]+1); //Avoid 0 weight issues
				n.size=size;
			});

			// Always call refresh after modifying data
			s.refresh();
			
			var attr=new Array();
			//attr.push("<dt>Label</dt><dd class=\"node\" data-id=\""+nodeObj.id+"\">"+nodeObj["label"]+"</dd>")
			if (nodeObj["attributes"]) {
				for (var key in nodeObj["attributes"]) {
					attr.push("<dt>"+key+"</dt><dd>"+nodeObj["attributes"][key]+"</dd>")
				}
			}
			
			//Populate attributepane
			var pane = $("#attributepane");
			pane.find(".headertext").html("Node details");
			if (oii.config.informationPanel.groupByEdgeDirection) {
				/*var outNodes=s.graph.outNeighbors(nodeId);
				var outNodesHTML=new Array(outNodes.length);
				var inNodes=s.graph.inNeighbors(nodeId);
				var inNodesHTML=new Array(inNodes.length);
				for (var n in outNodes) {
					n=outNodes[n];
					outNodesHTML.push('<li class="node" data-id="'+n.id+'"><a href="javascript:void(0);">'+n.label+'</a> ('
						+ e["attributes"]["weight"] + ')</li>');
				}
				for (var n in inNodes) {
					n=inNodes[n];
					inNodesHTML.push('<li class="node" data-id="'+n.id+'"><a href="javascript:void(0);">'+n.label+'</a></li>');
				}

				pane.find(".bodytext").html("<h2 class=\"node\" data-id=\""+nodeObj.id+"\">"+nodeObj["label"]+"</h2><dl>"+attr.join("")+"</dl><h2>Outgoing neighbors</h2><ul>"+outNodesHTML.join("")+"</ul><h2>Incoming neighbors</h2><ul>"+inNodesHTML.join("")+"</ul>");
			*/
			pane.find(".bodytext").html("<h2 class=\"node\" data-id=\""+nodeObj.id+"\">"+nodeObj["label"]+"</h2><dl>"+attr.join("")+"</dl><h2>Outgoing neighbors</h2><ul>"+outgoingEdgeHTML.join("")+"</ul><h2>Incoming neighbors</h2><ul>"+incomingEdgeHTML.join("")+"</ul>");
			} else {
				pane.find(".bodytext").html("<h2 class=\"node\" data-id=\""+nodeObj.id+"\">"+nodeObj["label"]+"</h2><dl>"+attr.join("")+"</dl><h2>Neighbors</h2><ul>"+neighbors.join("")+"</ul>");
			}
			pane.delay(400).animate({width:'show'},350);
	
			$(".node").click(function() {
				var nodeId=$(this).attr("data-id");
				var renderer = s.renderers[0];
				renderer.dispatchEvent('outNode', {node:s.graph.nodes(nodeId)});
				highlightNode(nodeId);
			});
			
			$(".node").hover(function() {
					//Mouse in
					var nodeId=$(this).attr("data-id");
					var renderer = s.renderers[0];
					renderer.dispatchEvent('overNode', {node:s.graph.nodes(nodeId)});
				}, function() {
					//Mouse out
					var nodeId=$(this).attr("data-id");
					var renderer = s.renderers[0];
					renderer.dispatchEvent('outNode', {node:s.graph.nodes(nodeId)});
				}
			);

		};
		
		s.bind('clickNode', function(e) {
			highlightNode(e.data.node.id);
		});


		// When the stage is clicked, we just color each
		// node and edge with its original color.
		s.bind('clickStage', function(e) {
			var action = $("#click_action select").val();
			filter.undo('neighbor-nodes').undo('neighbor-edges').apply();
			s.graph.nodes().forEach(function(n) {
				if ("target"==action) {
					n.size=Math.sqrt(s.graph.degree(n.id,'insum')); //n["attributes"]["indegree_sum"];
				} else if ("source"==action) {
					n.size=Math.sqrt(s.graph.degree(n.id,'outsum'));
				} else {
					n.size=Math.sqrt(s.graph.degree(n.id,'sum'));
				}

			});
			s.refresh();
			$("#attributepane").delay(400).animate({width:'hide'},350);
		});
		
		//Code for edge slider
		var max_edge=0;
		s.graph.edges().forEach(function(e) {
			var w=e["size"]; //TODO: Add parseFloat to ensure it is valid?
			if (w>max_edge)
				max_edge=w;
			//e["type"]="tapered";
		});
		s.refresh();
		console.log("max_edge is " + max_edge);
		$( "#slider-range" ).slider({
		  range: true,
		  min: 0,
		  max: max_edge,
		  values: [ 0, max_edge ],
		  slide: function( event, ui ) {
			$("#amount").val(""+ui.values[0] + " - " + ui.values[1]);
			filter.undo('slider').edgesBy(function(e) {
				return e["size"]>=ui.values[0] && e["size"]<=ui.values[1];
			},'slider').apply();
		  }
		});
			
		
		//Code for layout selector
		$("#layout select").change(function() {
				var str = $(this).val();
				console.log("Changing layout to " + str);
				s.graph.nodes().forEach(function(n) {
					n["x"]=n["layouts"][str]["x"];
					n["y"]=n["layouts"][str]["y"];
				});
				s.refresh();
		});
		
	
		//Populate the group selection box
		var cluster_html=Array(s.clusters.length);
		var x = 0;
		for (var cluster in s.clusters) {
			cluster_html[x]='<div style="line-height:12px"><a href="#' + cluster + '" class="groupSelect" data-cluster="' + cluster +'"><div style="width:40px;height:12px;border:1px solid #fff;background:' + cluster + ';display:inline-block"></div> Group ' + (x++) + ' (' + s.clusters[cluster].length + ' members)</a></div>';
		}
		$("#attributeselect .list").html(cluster_html.join(""));
		
		var select = $("#attributeselect .select");
		select.click(function () {
			var selector=$(this);
			var list = selector.next(".list");
			if (this.display) {
				this.display = !1;
				list.hide();
				selector.removeClass("close");
			} else {
				this.display = !0;
				list.show();
				selector.addClass("close");
			}
		});
		
		//TODO: Use filters API
		$(".groupSelect").click(function(evt){
			var cluster = $(this).attr("data-cluster");		
			var toKeep={};
			var results=[];
			s.graph.nodes().forEach(function(n) {
				if (n.originalColor==cluster) {
					emph(n);
					toKeep[n.id]=true;
					results.push('<li class="node" data-id="'+n.id+'"><a href="javascript:void(0);">'+n.label+'</a></li>');

				} else {
					unemph(n);
				}
			});

			s.graph.edges().forEach(function(e) {
				if (toKeep[e.source] && toKeep[e.target])
					emph(e);
				else
					unemph(e);
			});
			s.refresh();
		
			var pane = $("#attributepane");
			pane.find(".headertext").html("Cluster members");
			pane.find(".bodytext").html("<ul>"+results.join("")+"</ul>");
			pane.delay(400).animate({width:'show'},350);
		
			$(".node").click(function() {
				var nodeId=$(this).attr("data-id");
				var renderer = s.renderers[0];
				renderer.dispatchEvent('outNode', {node:s.graph.nodes(nodeId)});
				highlightNode(nodeId);
			});
			
			$(".node").hover(function() {
					//Mouse in
					var nodeId=$(this).attr("data-id");
					var renderer = s.renderers[0];
					renderer.dispatchEvent('overNode', {node:s.graph.nodes(nodeId)});
				}, function() {
					//Mouse out
					var nodeId=$(this).attr("data-id");
					var renderer = s.renderers[0];
					renderer.dispatchEvent('outNode', {node:s.graph.nodes(nodeId)});
				}
			);

		});
	
		//Code for search:
		$("#searchbox").keydown(function(evt) {
			if (evt["keyCode"]==13 || evt["key"]=="Enter") {
				var str=$(this).val();
				if (str.length>=3) {
					//Do a search!
					console.log("Searching for " + str);
					var regex = new RegExp(str,"gi"); //global, case-insensitive
					var results=new Array();
					s.graph.nodes().forEach(function(n) {
						if (regex.test(n.label)) {
							//results[n.id]=n.label;
							results.push('<li class="search-result" data-id="'+n.id+'"><a href="javascript:void(0);">'+n.label+'</a></li>');
						}
					});
					if (results.length==0) {
						results.push("<li>No results</li>");
					}
					var pane = $("#attributepane");
					pane.find(".headertext").html("Search results");
					pane.find(".bodytext").html("<ul>"+results.join("")+"</ul>");
					pane.delay(400).animate({width:'show'},350);
				
					$(".search-result").click(function() {
						var nodeId=$(this).attr("data-id");
						highlightNode(nodeId);
						$("#searchbox").val("");
					});
				}
				return false;
			}
		});
	

	}

	var s;
	oii.config('config.json', function(config) {
		if (config["version"]!=="2.0") {
			console.log("Bad config file version. Cannot proceede");
			document.getElementById('graph-container').innerHTML="<h1>The configuration file is of the wrong version, malformed, or inaccessible. The graph cannot be loaded.</h1>";
			return;
		}
		console.log("Config OK");
		sigma.renderers.def = sigma.renderers.canvas;
		sigma.parsers.json(config["data"],function(graph) {
			s = new sigma({
				graph: graph,
				renderer: {
					container: document.getElementById('graph-container'),
					type: 'canvas'
				},
				settings: config["sigma"]["settings"]
			});
			graph_setup(s);
						
			s.graph.nodes().forEach(function(n) {
				n.x=n.layouts["geo"].x;
				n.y=n.layouts["geo"].y;
				n.lat=-1*n.layouts["geo"].y;
				n.lng=n.layouts["geo"].x;
			});
			s.refresh();
			
			var geojson = new L.geoJson(MAP);		
			var map = L.map('map-container', {
			  layers: [geojson],
			  // avoid unexpected moves:
			  scrollWheelZoom: 'center',
			  doubleClickZoom: 'center',
			  bounceAtZoomLimits: false,
			  keyboard: false,
			  crs: L.CRS.EPSG4326,
			  zoom: 1,
			  center: [0,0]
			});//.setView([0, 0], 1)// Init view centered
			geojson.setStyle({"weight":2,"fill":false,"color":"#666666"});
			/*$.ajax({
			dataType: "json",
			url: "map.geojson",
			success: function(data) {
			    $(data.features).each(function(key, data) {
				   geojson.addData(data);
			    });
			}
			}).error(function() {});*/
			var leafletPlugin = sigma.plugins.leaflet(s, map, {});
			
			leafletPlugin.bind('enabled', function(event) {
			  console.log(event);
			});
			leafletPlugin.bind('disabled', function(event) {
			  console.log(event);
			});


			leafletPlugin.enable();
			leafletPlugin.fitBounds();

		});
		oii.config=config;
	
		//function setupGUI(config) {
		// Initialise main interface elements
		var logo=""; // Logo elements
		if (config.logo.file) {

			logo = "<img src=\"" + config.logo.file +"\"";
			if (config.logo.text) logo+=" alt=\"" + config.logo.text + "\"";
			logo+=">";
		} else if (config.logo.text) {
			logo="<h1>"+config.logo.text+"</h1>";
		}
		if (config.logo.link) logo="<a href=\"" + config.logo.link + "\">"+logo+"</a>";
		$("#maintitle").html(logo);

		// #title
		$("#title").html("<h2>"+config.text.title+"</h2>");

		// #titletext
		$("#titletext").html(config.text.intro);

		// More information
		if (config.text.more) {
			$("#information").html(config.text.more);
		} else {
			//hide more information link
			$("#moreinformation").hide();
		}

		// Legend

		// Node
		if (config.legend.nodeLabel) {
			$(".node").next().html(config.legend.nodeLabel);
		} else {
			//hide more information link
			$(".node").hide();
		}
		// Edge
		if (config.legend.edgeLabel) {
			$(".edge").next().html(config.legend.edgeLabel);
		} else {
			//hide more information link
			$(".edge").hide();
		}
		// Colours
		if (config.legend.nodeLabel) {
			$(".colours").next().html(config.legend.colorLabel);
		} else {
			//hide more information link
			$(".colours").hide();
		}
	
		if (!config.features.search) {
			$("#search").hide();
		}
		if (!config.features.groupSelectorAttribute) {
			$("#attributeselect").hide();
		}
	   
	
	});
});
