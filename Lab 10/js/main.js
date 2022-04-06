//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    var width = 960,
        height = 460; //map frame

    var map = d3.select("body")
        .append("svg")
        .attr("class","map")
        .attr("width", width)
        .attr("height", height); //creates svg container for map

    var projection = d3.geoAlbers()
        .center([0,38.15])
        .rotate([108.27,0,0])
        .parallels([43,62])
        .scale(730)
        .translate([width/2,height/2]);

    var path = d3.geoPath()
        .projection(projection)

    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/unitsData.csv"),                    
                    d3.json("data/usStates.topojson"),   
                    d3.json("data/surroundingCountries.topojson")                
                    ];    


    Promise.all(promises).then(callback);

    function callback(data){

        var csvData = data[0],
            states = data[1],
            country = data [2];

        console.log(csvData);

        var usStates = topojson.feature(states, states.objects.ne_50m_admin_1_states_provinces).features,
            surroundingCountries = topojson.feature(country, country.objects.ne_50m_admin_0_countries);

        //variables for data join
        var attrArray = ["varA", "varB", "varC", "varD", "varE"];

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.adm1_code; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a=0; a<usStates.length; a++){

                var geojsonProps = usStates[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

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

        console.log(attrArray);

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

        var countries = map.append("path")
            .datum(surroundingCountries)
            .attr("class","countries")
            .attr("d",path);

        var theStates = map.selectAll(".states")
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return"states " + d.properties.adm1_code
            })
            .attr("d",path);

        
    }
};