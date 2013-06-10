var kippis = null;
var dev = false;

if (!localStorage) {
    localStorage = {
        dummy: true,
        setItem: function() {},
        getItem: function() {}
    }
}

//populated history
if (dev) {
    var drinkhistory = [
        {
            time: new Date(2013, 5, 29, 20, 0, 0, 0),
            percent: 5.4,
            amount: 33
        },
        {
            time: new Date(2013, 5, 29, 20, 15, 0, 0),
            percent: 4.7,
            amount: 33
        },
        {
            time: new Date(2013, 5, 29, 20, 35, 0, 0),
            percent: 4.7,
            amount: 50
        },
        {
            time: new Date(2013, 5, 29, 21, 30, 0, 0),
            percent: 40,
            amount: 4
        },
        {
            time: new Date(2013, 5, 29, 21, 35, 0, 0),
            percent: 4.7,
            amount: 33
        }
    ];
} else {
    drinkhistory = [];
}

(function() {
    "use strict";
    /**
     * App wide variables. Init with debug values.
     * 
     * @object 
     */
    var vars = {
        graph: null,
        ch: 300,
        cw: 400,
        personweight: 70,
        drinkvolume: 33,
        drinkpercent: 5,
        ismale: true,
        malefactor: 0.58,
        femalefactor: 0.49,
        margin: 10,
        alcoholdensity: 0.789,
        startDate: new Date(2013,5,29,19,40,0,0),
        currentTime: new Date(2013,5,29,22,0,0,0),
        pixelsperminute: 4,
        pixelsperpromille: 0,
        leftx: 40
    };
    
    var burnrateperminute = 0.017 * (1/60) * 10;
    var points;
    var autoupdateintervalid = 0;
    var scrollleft = 0;
    
    /**
     * Public methods to use in kippis variable.
     * 
     * @type type
     */
    var methods = {
        init: function() {
            var graphelem = document.getElementById("graph");
            vars.graph = graphelem.getContext("2d");
            vars.cw = graphelem.getAttribute("width");
            vars.ch = graphelem.getAttribute("height");
            vars.pixelsperpromille = calcpixelsperpromille();
            methods.handleResize();
            
            //crisp lines
            vars.graph.translate(0.5, 0.5);
            
            methods.initData();
            points = calcpoints();
            methods.initEvents();
            methods.startInterval();
        },
                
        initEvents: function() {
            $(".alcoholcontent.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                vars.drinkpercent += 0.5;
                if (vars.drinkpercent > 100) {
                    vars.drinkpercent = 100;
                }
                
                $(this).parent().find('.amount').html(roundfloat(vars.drinkpercent, 1) + "%");
            });
            $(".alcoholcontent.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                vars.drinkpercent -= 0.5;
                if (vars.drinkpercent < 0) {
                    vars.drinkpercent = 0;
                }
                
                $(this).parent().find('.amount').html(roundfloat(vars.drinkpercent, 1) + "%");
            });
            
            var lastx = 0;
            $(".alcoholcontent.slider .amount").hammer().on('dragstart', function(event) {
                lastx = event.gesture.center.pageX;
            }).on('drag', function(event) {
                var moved = parseInt(event.gesture.center.pageX - lastx);
                lastx = event.gesture.center.pageX;
                
                vars.drinkpercent += (moved / 40);
                if (vars.drinkpercent < 0) {
                    vars.drinkpercent = 0;
                } else if (vars.drinkpercent > 100) {
                    vars.drinkpercent = 100;
                }
                
                $(this).html(roundfloat(vars.drinkpercent, 1) + "%");
            });
            
            //size of servings events
            $(".servingsize.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                vars.drinkvolume += 1;
                $(this).parent().find('.amount').html(roundfloat(vars.drinkvolume, 0) + "cl");
            });
            $(".servingsize.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                vars.drinkvolume -= 1;
                if (vars.drinkvolume < 1) {
                    vars.drinkvolume = 1;
                }
                $(this).parent().find('.amount').html(roundfloat(vars.drinkvolume, 0) + "cl");
            });
            
            $(".servingsize.slider .amount").hammer().on('dragstart', function(event) {
                lastx = event.gesture.center.pageX;
            }).on('drag', function(event) {
                var moved = parseInt(event.gesture.center.pageX - lastx);
                lastx = event.gesture.center.pageX;
                
                vars.drinkvolume += moved / 4;
                if (vars.drinkvolume < 1) {
                    vars.drinkvolume = 1;
                }
                $(this).parent().find('.amount').html(roundfloat(vars.drinkvolume, 0) + "cl");
            });
            
            $(".weight.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                vars.personweight += 1;
                console.log(vars.personweight);
                $(this).parent().find('.amount').html(roundfloat(vars.personweight, 0) + "kg")
                points = calcpoints();
                methods.drawGraph();
                
                localStorage.setItem("weight", roundfloat(vars.personweight, 0));
            });
            $(".weight.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                vars.personweight -= 1;
                if (vars.personweight < 30) {
                    vars.personweight = 30;
                }
                $(this).parent().find('.amount').html(roundfloat(vars.personweight, 0) + "kg")
                points = calcpoints();
                methods.drawGraph();
                
                localStorage.setItem("weight", roundfloat(vars.personweight, 0));
            });
            
            $(".weight.slider .amount").hammer().on('dragstart', function(event) {
                lastx = event.gesture.center.pageX;
            }).on('drag', function(event) {
                var moved = parseInt(event.gesture.center.pageX - lastx);
                lastx = event.gesture.center.pageX;
                vars.personweight += moved / 4;
                if (vars.personweight < 30) {
                    vars.personweight = 30;
                }
                $(this).parent().find('.amount').html(roundfloat(vars.personweight, 0) + "kg")
                points = calcpoints();
                methods.drawGraph();
                
                localStorage.setItem("weight", roundfloat(vars.personweight, 0));
            });
            
            $(".gender span").on('click', function(event) {
                $(this).parent().find("span").removeClass("selected");
                $(this).addClass("selected");
                var selected = "";
                if ($(this).hasClass("male")) {
                    vars.ismale = true;
                    selected = "male";
                } else {
                    vars.ismale = false;
                    selected = "female";
                }
                
                localStorage.setItem("sex", selected);
                
                points = calcpoints();
                methods.drawGraph();
            });
            
            var lastx = 0;

            $("canvas").hammer().on('drag', function(event) {
                if (points.length === 0)
                    return;
                
                var xmove = event.gesture.touches[0].pageX - lastx;
                lastx = event.gesture.touches[0].pageX;
                scrollleft += xmove;
                if (scrollleft > 0) {
                    scrollleft = 0;
                }
                
                //TODO: bar doesn't align properly to end
                var rightend = (points[points.length-1].endx + vars.cw / vars.pixelsperminute + vars.leftx) * -1;
                if (scrollleft < rightend) {
                    scrollleft = rightend;
                }
                
                methods.drawGraph();
            }).on('dragend', function() {
                lastx = 0;
            }).on('dragstart', function(event) {
                lastx = event.gesture.touches[0].pageX;
            });
            
            var resizetimeout = 0;
            $(window).resize(function() {
                methods.handleResize();
                clearTimeout(resizetimeout);
                resizetimeout = setTimeout(function() {
                    methods.drawGraph();
                }, 200);
            });
            
            $("button.add").on('click', function(event) {
                var cl = roundfloat(vars.drinkvolume, 0);
                var percent = roundfloat(vars.drinkpercent, 1);
                var n = {
                    time: new Date(),
                    percent: percent,
                    amount: cl
                };
                
                if (drinkhistory.length == 0) {
                    vars.startDate = new Date();
                    vars.startDate.setMinutes(0);
                }
                
                drinkhistory.push(n);
                points = calcpoints();
                methods.drawGraph();
            });
        },
                
        initData: function() {
            $(".weight .amount").html(vars.personweight + "kg");
            
            if (localStorage.dummy) {
                return;
            }
            
            var weight = localStorage.getItem("weight");
            var sex = localStorage.getItem("sex");
            
            if (weight !== null) {
                $(".weight .amount").html(weight + "kg");
                vars.personweight = parseInt(weight);
            }
            if (sex !== null) {
                $(".gender span").removeClass("selected");
                $(".gender ." + sex).addClass("selected");
                if (sex === "male") {
                    vars.ismale = true;
                }
            }
            
            
        },
                
        handleResize: function() {
            var w = $("section.graph").width();
            $("canvas").attr("width", w);
            vars.cw = w;
        },
                
        startInterval: function() {
            autoupdateintervalid = setInterval(function() {
                methods.drawGraph();
            }, 120000);
        },
                
        drawGraph: function() {
            var g = vars.graph;
            g.clearRect(0,0,vars.cw,vars.ch);
            g.font = "9pt arial";
            
            var bottomy = vars.ch - vars.margin - 30;

            if (points.length > 0) {
                var lastminute = points[points.length-1].endx * vars.pixelsperminute + vars.leftx;
            }

            //scrollbar
            var barwidth = vars.cw - vars.leftx - 10;
            g.fillStyle = "#DDDDDD";
            g.fillRect(vars.leftx, bottomy + 25, barwidth, 10);
            g.fillStyle = "#FFAF3C";
            g.fillRect(vars.leftx + 1 + (-1 * scrollleft / lastminute) * vars.cw, bottomy + 26, 100, 8);
  
            //horizontal lines
            g.lineWidth = 0.5;
            g.strokeStyle = "#AAAAAA";
            g.fillStyle = "#555555";
            g.textAlign = "right";
            g.beginPath();
            for (var i = 0; i < 3.5; i += 0.5) {
                g.moveTo(vars.leftx, bottomy - vars.pixelsperpromille * i);
                g.lineTo(vars.cw, bottomy - vars.pixelsperpromille * i);
                g.fillText(i, vars.leftx - 5, bottomy - vars.pixelsperpromille * i);
            }
            g.stroke();
            g.beginPath();
            g.moveTo(vars.leftx, bottomy);
            g.lineTo(vars.leftx, 0);
            g.stroke();

            if (points.length === 0) {
                return;
            }
            
            g.save();
            g.rect(vars.leftx, 0, vars.cw, vars.ch);
            g.clip();
            g.translate(scrollleft, 0);

            //times
            g.textAlign = "center";
            var printdate = new Date(vars.startDate.getTime());
            for (var i = 0; i < Math.ceil(lastminute / 30) / 2; i++) {
                g.fillText(printdate.getHours() + ":" + pad(printdate.getMinutes()), vars.leftx + i * 30 * vars.pixelsperminute, bottomy + 15);
                printdate.setTime(printdate.getTime() + 30 * 60000);
            }
            
            //draw graph line
            g.strokeStyle = "#FFAF3C";
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(vars.leftx,bottomy);
            g.lineTo(vars.leftx + vars.pixelsperminute * points[0].startx, bottomy);
            for (var i = 0; i < points.length; i++) {
                g.quadraticCurveTo(vars.leftx + vars.pixelsperminute * points[i].startx, bottomy - points[i].peaky * vars.pixelsperpromille, vars.leftx + vars.pixelsperminute * points[i].peakx, bottomy - points[i].peaky * vars.pixelsperpromille);
                if (points[i].endx > points[i].peakx) {
                    g.lineTo(vars.leftx + vars.pixelsperminute * points[i].endx, bottomy - points[i].endy * vars.pixelsperpromille);
                }
            }
            g.stroke();
            
            //Draw dots on line
            for (var i = 0; i < points.length; i++) {
                g.beginPath();
                g.arc(vars.leftx + points[i].startx * vars.pixelsperminute, bottomy - points[i].starty * vars.pixelsperpromille, 4, 0, 2 * Math.PI, false);
                g.fillStyle = 'white';
                g.fill();
                g.lineWidth = 2;
                g.strokeStyle = '#FFAF3C';
                g.stroke();
            }
            
            //draw current alc
            vars.currentTime = new Date();
            var currentminutes = (vars.currentTime - vars.startDate.getTime()) / 1000 / 60;
            var lastpoint = points[points.length-1];
            var tolastdrink = currentminutes - lastpoint.time;
            
            //vertical line
            g.beginPath();
            g.strokeStyle = "#4dcdff";
            g.lineWidth = 1;
            g.moveTo(vars.leftx + vars.pixelsperminute * currentminutes, bottomy);
            g.lineTo(vars.leftx + vars.pixelsperminute * currentminutes, 0);
            g.stroke();
            
            
            var currentpromilles = lastpoint.starty + lastpoint.promilles - burnrateperminute * tolastdrink;
            g.fillStyle = "black";
            g.textAlign = "left";
            g.font = "40px arial";
            var promilles = parseInt(currentpromilles * 100)/100;
            if (promilles < 0) {
                promilles = "0.00";
            }
            g.fillText(promilles + "‰", vars.leftx + vars.pixelsperminute * currentminutes + 10, bottomy - 20 - currentpromilles * vars.pixelsperpromille);
            
            g.restore();
        }
    };
    
    function calcpixelsperpromille() {
        return (vars.ch - 30 - vars.margin * 2) / 3;
    }
    
    function calcpoints() {
        var waterinbody = vars.personweight;
        if (vars.ismale) {
            waterinbody *= vars.malefactor;
        } else {
            waterinbody *= vars.femalefactor;
        }
        
        /**
         * Wirdmarks formula
         * 
         * @param {Number} purealcohol alcohol in milligrams
         * @returns {Number} Amount of alcohol in blood in promilllse
         */
        var alcincrease = function(purealcohol) {
            var stantarddrinks = purealcohol / 10 * 1.2;
            //human body has 80.6% of water in body
            return ((0.806 * stantarddrinks) / waterinbody) * 10;
        };

        //process points of interest
        var startminutes = vars.startDate.getTime() / 1000 / 60;
        var poi = [];
        for (var i = 0; i < drinkhistory.length; i++) {
            var minutesfromstart = drinkhistory[i].time.getTime() / 1000 / 60 - startminutes;
            var purealcohol = (drinkhistory[i].percent / 100) * drinkhistory[i].amount * 10 * vars.alcoholdensity;
            var d = {
                time: minutesfromstart,
                alc: purealcohol,
                promilles: alcincrease(purealcohol)
            };
          
            poi.push(d);
        }
        
        var alcinlastpoint = 0;
        /**
         * iterate created poi's and create graph points. Create high point
         * 30 mins after consuming or less if another one is consumed
         * 
         * x = minutes
         * y = promilles
         */
        for (var i = 0; i < poi.length; i++) {
            var current = poi[i];
            var difference = 0;
            //calc difference to ending point
            if (i == poi.length - 1) {
                difference = Math.ceil((alcinlastpoint + current.promilles ) / burnrateperminute);
            } else {
                difference = poi[i+1].time - current.time;
            }
            
            current.starty = alcinlastpoint;
            current.startx = current.time;
            current.endy = alcinlastpoint + current.promilles - (difference * burnrateperminute);
            if (current.endy < 0) {
                current.endy = 0;
            }
            current.endx = current.time + difference;
            if (difference > 30) {    
                current.peaky = alcinlastpoint + current.promilles - (30 * burnrateperminute);
                current.peakx = current.time + 30;
            } else {
                current.peaky = alcinlastpoint + current.promilles - (difference * burnrateperminute);
                current.peakx = current.time + difference;
            }
            
            alcinlastpoint = current.endy;
        }
        
        return poi;
    }
    
    function pad(n){return n<10 ? '0'+n : n}
    
    function pointatquadraticcurve(t, point) {
        var x = Math.sqrt(1-t) * point.startx + 2 * (1-t) * t * point.startx + Math.sqrt(t) * point.peakx; 
        var y = Math.sqrt(1-t) * point.starty + 2 * (1-t) * t * point.peaky + Math.sqrt(t) * point.peaky; 
        return { x: x, y: y };
    }
    
    /**
     * 
     * @param {type} i number
     * @param {type} n decimals
     * @returns {Number|@exp;@call;parseInt}
     */
    function roundfloat(i, n) {
        if (n == 0) {
            return parseInt(i);
        }
        return parseInt(i * (10 * n)) / (10 * n);
    }
    
    kippis = methods;
})();

$(document).ready(function() {
    kippis.init();
    kippis.drawGraph();
});

