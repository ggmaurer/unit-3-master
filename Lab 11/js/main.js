

(function(){

    //begin script when window loads
    window.onload = 
    createTitle();
    setMap();

    var attrArray = ["Percent_of_State_with_Bachlelors_or_Higher", "Percent_of_Incomes_Below_Poverty", "Percent_in_Poverty_without_a_Diploma", "Percent_in_Poverty_with_a_Diploma", "Percent_in_Poverty_with_a_Bachelors_or_Higher"];
    var expressed = attrArray[0];
    
    //creates a semi global variable in order to simplify the coding
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 30]);

    //function to create a new svg for the title
    function createTitle(){
        var titleSection = d3.select("body")
            .append("svg")
            .attr("class","title")
            .attr("width", window.innerWidth)
            .attr("height", 80)
        var siteTitle = titleSection.append("text")
            .attr("x", 550)
            .attr("y", 60)
            .attr("class", "siteTitle")
            .text("Poverty and Educational Attainment") //creates svg container for map
    }
    
    //set up choropleth map
    function setMap(){

        var width = window.innerWidth * 0.5,
            height = 460; //map frame

        var map = d3.select("body")
            .append("svg")
            .attr("class","map")
            .attr("width", width)
            .attr("height", height); //creates svg container for map

        var projection = d3.geoAlbers()
            .center([2,39.15])
            .rotate([105.27,0,0])
            .parallels([43,62])
            .scale(1000)
            .translate([width/2,height/2]);

        var path = d3.geoPath()
            .projection(projection)

        //use Promise.all to parallelize asynchronous data loading
        var promises = [d3.csv("data/unitsData.csv"),                    
                        d3.json("data/usStates.topojson"),   
                        d3.json("data/surroundingCountries.topojson")                
                        ];    


        Promise.all(promises).then(callback);

        //calls all of the other functinos and creates the data variables
        function callback(data){

            var csvData = data[0],
                states = data[1],
                country = data [2];

            setGraticule(map,path);

            var usStates = topojson.feature(states, states.objects.ne_50m_admin_1_states_provinces).features,
                surroundingCountries = topojson.feature(country, country.objects.ne_50m_admin_0_countries);

            var countries = map.append("path")
                .datum(surroundingCountries)
                .attr("class","countries")
                .attr("d",path);

            var colorScale = makeColorScale(csvData);

            usStates = joinData(usStates, csvData);
            setEnumerationUnits(usStates, map, path, colorScale);

            
            setChart(csvData, colorScale);
            createDropDown(csvData);
            metaData();
            
        }
        function setGraticule(map, path){
            var graticule = d3.geoGraticule().step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

                //create graticule background
                var gratBackground = map
                    .append("path")
                    .datum(graticule.outline()) //bind graticule background
                    .attr("class", "gratBackground") //assign class for styling
                    .attr("d", path); //project graticule
        
                //create graticule lines
                var gratLines = map
                    .selectAll(".gratLines") //select graticule elements that will be created
                    .data(graticule.lines()) //bind graticule lines to each element to be created
                    .enter() //create an element for each datum
                    .append("path") //append each element to the svg as a path element
                    .attr("class", "gratLines") //assign class for styling
                    .attr("d", path); //project graticule lines
        };
        
        //joins the data to the map
        function joinData(usStates, csvData){
            for (var i=0; i<csvData.length; i++){
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.name; //the CSV primary key
            
            
                //loop through geojson regions to find correct region
                for (var a=0; a<usStates.length; a++){

                    var geojsonProps = usStates[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.name; //the geojson primary key
                    
                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey){

                        //assign all attributes and values
                        attrArray.forEach(function(attr){
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    };
                };
            };
        
            return usStates;
        };

        function makeColorScale(data){
            var colorClasses = [
                "#fee5d9",
                "#fcae91",
                "#fb6a4a",
                "#de2d26",
                "#a50f15"
            ];
        
            //create color scale generator
            var colorScale = d3.scaleQuantile()
                .range(colorClasses);
        
            //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };
        
            //assign array of expressed values as scale domain
            colorScale.domain(domainArray);
        
            return colorScale;
        };
        
        function hightlight(props){

            var selected = d3.selectAll("." + props.name)
                .style("stroke", "cyan")
                .style("stroke-width", "3");

            setLabel(props);
        };

        function dehightlight(props){
            
            var states = d3.selectAll(".states")
                .style("stroke", "black")
                .style("stroke-width", "0.5");

            var bars = d3.selectAll(".bar")
                .style("stroke", "none")
                .style("stroke-width", "0");

                d3.select(".infolabel")
                .remove();
        };

        //adds the values on each state to the map.
        function setEnumerationUnits(usStates, map, path, colorScale){
            var theStates = map.selectAll(".states")
                .data(usStates)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "states " + d.properties.name;
                })
                .attr("d",path)
                .style("fill", function(d){
                    var value = d.properties[expressed];            
                if(value) {                
                    return colorScale(d.properties[expressed]);            
                } else {                
                    return "#ccc";            
                }
                })
                .on("mouseover", function(event,d){
                    hightlight(d.properties)
                })
                .on("mouseout", function(event,d){
                    dehightlight(d.properties)
                })
                .on("mousemove", moveLabel);
        };

    

        function setChart(csvData, colorScale){
            //chart frame dimensions
            
        
            //create a second svg element to hold the bar chart
            var chart = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("class", "chart");
        
            //create a rectangle for chart background fill
            var chartBackground = chart.append("rect")
                .attr("class", "chartBackground")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);
        
            //create a scale to size bars proportionally to frame and for axis
        
        
            //set bars for each province
            var bars = chart
                .selectAll(".bar")
                .data(csvData)
                .enter()
                .append("rect")
                .sort(function(a, b){
                    return b[expressed]-a[expressed]
                })
                .attr("class", function(d){
                    return "bar " + d.name;
                })
                .attr("width", chartInnerWidth / csvData.length - 1)
                .on("mouseover", function(event,d){
                    hightlight(d)
                })
                .on("mouseout", function(event,d){
                    dehightlight(d.properties)
                })
                .on("mousemove", moveLabel);

                updateChart(bars, csvData.length, colorScale);
        
            //create a text element for the chart title
            var chartTitle = chart.append("text")
                .attr("x", 40)
                .attr("y", 40)
                .attr("class", "chartTitle")
                .text("Percentage of the Population with a Bachelors Degree");
        
            //create vertical axis generator
            var yAxis = d3.axisLeft()
                .scale(yScale);
        
            //place axis
            var axis = chart.append("g")
                .attr("class", "axis")
                .attr("transform", translate)
                .call(yAxis);
        
            //create frame for chart border
            var chartFrame = chart.append("rect")
                .attr("class", "chartFrame")
                .attr("width", chartInnerWidth)
                .attr("height", chartInnerHeight)
                .attr("transform", translate);
                
        }

        function createDropDown(csvData){
            //add the select element
            var dropdown = d3.select("body")
                .append("select")
                .attr("class", "dropdown")
                .on("change", function(){  
                    changeAttribute(this.value, csvData)
                });

            //add initial option
            var titleOption = dropdown
                .append("option")
                .attr("class", "titleOption")
                .attr("disabled", "true")
                .text("Select Attribute");

            var attrOptions = dropdown 
                .selectAll("attrOptions")
                .data(attrArray)
                .enter()
                .append("option")
                .attr("value", function(d){
                    return d;
                })
                .text(function(d){
                    return d.replaceAll("_", " ");
                });
            
        }

        function changeAttribute(attribute, csvData){
            expressed = attribute;
            //calls colorscale function to apply colorscale to changing attributes
            var colorScale = makeColorScale(csvData);

            var regions = d3.selectAll(".states")
                .transition()
                .duration(1000)
                .style("fill", function(d) {
                    var value = d.properties[expressed];

                    if (value) {
                        return colorScale(d.properties[expressed]);
                    } else {
                        return "#ccc";
                    }
                });
            
            var bars = d3.selectAll(".bar")
                .sort(function(a,b){
                    return b[expressed] - a[expressed];
                })
                .transition()
                .delay(function(d,i){
                    return i * 20
                })
                .duration(1000);

            updateChart(bars, csvData.length, colorScale);
                
        }

        function updateChart(bars, n, colorScale){
            //position bars
            bars.attr("x", function(d, i){
                    return i * (chartInnerWidth / n) + leftPadding;
                })
                //size/resize bars
                .attr("height", function(d, i){
                    return 463 - yScale(parseFloat(d[expressed]));
                })
                .attr("y", function(d, i){
                    return yScale(parseFloat(d[expressed])) + topBottomPadding;
                })
                //color/recolor bars
                .style("fill", function(d){            
                    var value = d[expressed];            
                    if(value) {                
                        return colorScale(value);            
                    } else {                
                        return "#ccc";            
                    }    
            });
            
            var chartTitle = d3.select(".chartTitle")
                .text(expressed.replaceAll("_", " "))

        };

        //function to create dynamic label
        function setLabel(props){
            //label content
            var labelAttribute = "<h1>" + props[expressed] +
                "</h1><b>" + expressed.replaceAll("_", " ") + "</b>";

            //create info label div
            var infolabel = d3.select("body")
                .append("div")
                .attr("class", "infolabel")
                .attr("id", props.name + "_label")
                .html(labelAttribute);

            var stateName = infolabel.append("div")
                .attr("class", "labelname")
                .html(props.name);
        };

        //function to move info label with mouse
        function moveLabel() {
            //get width of label
            var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

            //use coordinates of mousemove event to set label coordinates
            var x1 = event.clientX + 10,
                y1 = event.clientY - 75,
                x2 = event.clientX - labelWidth - 10,
                y2 = event.clientY + 25;

            //horizontal label coordinate, testing for overflow
            var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
            //vertical label coordinate, testing for overflow
            var y = event.clientY < 75 ? y2 : y1;

            d3.select(".infolabel")
                .style("left", x + "px")
                .style("top", y + "px");
        }

        function metaData(){
            var theInfo = d3.select("body")
                .append("svg")
                .attr("width", chartWidth)
                .attr("height", 325)
                .attr("class", "information");
            var name = theInfo.append("text")
                .attr("x", 40)
                .attr("y", 295)
                .attr("class", "theMetadata")
                .text("Gavin Maurer");
            var date = theInfo.append("text")
                .attr("x", 40)
                .attr("y", 305)
                .attr("class", "theMetadata")
                .text("19 April 2022"); 
            var projection = theInfo.append("text")
                .attr("x", 40)
                .attr("y", 315)
                .attr("class", "theMetadata")
                .text("Albers WGS 1984");
            var source = theInfo.append("text")
                .attr("x", 40)
                .attr("y", 325)
                .attr("class", "theMetadata")
                .text("Steven Manson, Jonathan Schroeder, David Van Riper, Tracy Kugler, and Steven Ruggles. IPUMS National Historical Geographic Information System: Version 16.0 [dataset]. Minneapolis, MN: IPUMS. 2021. http://doi.org/10.18128/D050.V16.0")
        }
        
    };
})();