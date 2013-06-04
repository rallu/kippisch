var kippis = null;
var dev = false;

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
    /**
     * App wide variables. Init with debug values.
     * 
     * @object 
     */
    var vars = {
        graph: null,
        ch: 300,
        cw: 400,
        personweight: 88,
        ismale: true,
        malefactor: 0.58,
        femalefactor: 0.49,
        margin: 10,
        alcoholdensity: 0.789,
        startDate: new Date(2013,5,29,19,40,0,0),
        currentTime: new Date(2013,5,29,22,0,0,0)
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
    var public = {
        init: function() {
            var graphelem = document.getElementById("graph");
            vars.graph = graphelem.getContext("2d");
            vars.cw = graphelem.getAttribute("width");
            vars.ch = graphelem.getAttribute("height");
            public.handleResize();
            
            //crisp lines
            vars.graph.translate(0.5, 0.5);
            
            points = calcpoints();
            public.initEvents();
            public.startInterval();
        },
                
        initEvents: function() {
            $(".alcoholcontent.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseFloat(elem.html());
                amount += 0.5;
                if (amount > 100)
                    amount = 100;
                elem.html(amount + "%");
            });
            $(".alcoholcontent.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseFloat(elem.html());
                amount -= 0.5;
                if (amount < 0) {
                    amount = 0;
                }
                elem.html(amount + "%");
            });
            
            $(".servingsize.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseFloat(elem.html());
                amount += 1;
                if (amount > 100)
                    amount = 100;
                elem.html(amount + "cl");
            });
            $(".servingsize.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseFloat(elem.html());
                amount -= 1;
                if (amount < 0) {
                    amount = 0;
                }
                elem.html(amount + "cl");
            });
            
            $(".weight.slider").find(".btnmore").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseInt(elem.html());
                amount += 1;
                vars.personweight = amount;
                elem.html(amount + "kg");
                points = calcpoints();
                public.drawGraph();
            });
            $(".weight.slider").find(".btnless").on('click', function(event)  {
                event.preventDefault();
                var elem = $(this).parent().find('.amount');
                var amount = parseInt(elem.html());
                amount -= 1;
                if (amount < 30) {
                    amount = 30;
                }
                vars.personweight = amount;
                elem.html(amount + "kg");
                points = calcpoints();
                public.drawGraph();
            });
            
            $(".gender span").on('click', function(event) {
                $(this).parent().find("span").removeClass("selected");
                $(this).addClass("selected");
                if ($(this).hasClass("male")) {
                    vars.ismale = true;
                } else {
                    vars.ismale = false;
                }
                points = calcpoints();
                public.drawGraph();
            });
            
            var lastx = 0;

            $("canvas").hammer().on('drag', function(event) {
                var xmove = event.gesture.touches[0].pageX - lastx;
                lastx = event.gesture.touches[0].pageX;
                scrollleft += xmove;
                if (scrollleft > 0) {
                    scrollleft = 0;
                }
                public.drawGraph();
            }).on('dragend', function() {
                lastx = 0;
            }).on('dragstart', function(event) {
                lastx = event.gesture.touches[0].pageX;
            });
            
            var resizetimeout = 0;
            $(window).resize(function() {
                public.handleResize();
                clearTimeout(resizetimeout);
                resizetimeout = setTimeout(function() {
                    public.drawGraph();
                }, 200);
            });
            
            $("button.add").on('click', function(event) {
                var cl = parseInt($(".servingsize.slider .amount").html());
                var percent = parseFloat($(".alcoholcontent.slider .amount").html());
                var n = {
                    time: new Date(),
                    percent: percent,
                    amount: cl
                };
                
                if (drinkhistory.length == 0) {
                    //startDate = new Date(n.time.getYear(), n.time.getMonth(), n.time.getDay(), n.time.getHours(), 0, 0, 0);
                    vars.startDate = new Date();
                    vars.startDate.setMinutes(0);
                }
                
                drinkhistory.push(n);
                points = calcpoints();
                public.drawGraph();
            });
        },
                
        handleResize: function() {
            var w = $("section.graph").width();
            $("canvas").attr("width", w);
            vars.cw = w;
        },
                
        startInterval: function() {
            autoupdateintervalid = setInterval(function() {
                public.drawGraph();
            }, 120000);
        },
                
        drawGraph: function() {
            var g = vars.graph;
            g.clearRect(0,0,vars.cw,vars.ch);
            g.font = "9pt arial";
            
            var bottomy = vars.ch - vars.margin - 30;
            var leftx = 40;
            var pixelsperminute = 4;
            var pixelsperpromille = (vars.ch - 30 - vars.margin * 2) / 3;
            
            if (points.length > 0) {
                var lastminute = points[points.length-1].endx * pixelsperminute + leftx;
            }

            //scrollbar
            var barwidth = vars.cw - leftx - 10;
            g.fillStyle = "#DDDDDD";
            g.fillRect(leftx, bottomy + 25, barwidth, 10);
            g.fillStyle = "#FFAF3C";
            g.fillRect(leftx + 1 + (-1* scrollleft / lastminute) * vars.cw, bottomy + 26, 100, 8);
  
            //horizontal lines
            g.lineWidth = 0.5;
            g.strokeStyle = "#AAAAAA";
            g.fillStyle = "#555555";
            g.textAlign = "right";
            for (var i = 0; i < 3.5; i += 0.5) {
                g.beginPath();
                g.moveTo(leftx, bottomy - pixelsperpromille * i);
                g.lineTo(vars.cw, bottomy - pixelsperpromille * i);
                g.stroke();
                g.fillText(i, leftx - 5, bottomy - pixelsperpromille * i);
            }
            g.beginPath();
            g.moveTo(leftx, bottomy);
            g.lineTo(leftx, 0);
            g.stroke();

            if (points.length === 0) {
                return;
            }

            g.save();
            g.rect(leftx, 0, vars.cw, vars.ch);
            g.clip();
            g.translate(scrollleft, 0);

            //times
            g.textAlign = "center";
            var printdate = new Date(vars.startDate.getTime());
            for (var i = 0; i < Math.ceil(lastminute / 30) / 2; i++) {
                g.fillText(printdate.getHours() + ":" + pad(printdate.getMinutes()), leftx + i * 30 * pixelsperminute, bottomy + 15);
                printdate.setTime(printdate.getTime() + 30 * 60000);
            }
            
            //draw graph line
            g.strokeStyle = "#FFAF3C";
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(leftx,bottomy);
            g.lineTo(leftx + pixelsperminute * points[0].startx, bottomy);
            for (var i = 0; i < points.length; i++) {
                g.quadraticCurveTo(leftx + pixelsperminute * points[i].startx, bottomy - points[i].peaky * pixelsperpromille, leftx + pixelsperminute * points[i].peakx, bottomy - points[i].peaky * pixelsperpromille);
                if (points[i].endx > points[i].peakx) {
                    g.lineTo(leftx + pixelsperminute * points[i].endx, bottomy - points[i].endy * pixelsperpromille);
                }
            }
            g.stroke();
            
            //Draw dots on line
            for (var i = 0; i < points.length; i++) {
                g.beginPath();
                g.arc(leftx + points[i].startx * pixelsperminute, bottomy - points[i].starty * pixelsperpromille, 4, 0, 2 * Math.PI, false);
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
            g.moveTo(leftx + pixelsperminute * currentminutes, bottomy);
            g.lineTo(leftx + pixelsperminute * currentminutes, 0);
            g.stroke();
            
            
            var currentpromilles = lastpoint.starty + lastpoint.promilles - burnrateperminute * tolastdrink;
            g.fillStyle = "black";
            g.textAlign = "left";
            g.font = "40px arial";
            g.fillText(parseInt(currentpromilles * 100)/100 + "‰", leftx + pixelsperminute * currentminutes + 10, bottomy - 20 - currentpromilles * pixelsperpromille);
            
            g.restore();
        },
        
        
    };
    
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
    
    kippis = public;
})();

$(document).ready(function() {
    kippis.init();
    kippis.drawGraph();
});

