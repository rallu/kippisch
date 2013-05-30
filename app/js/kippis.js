var kippis = null;

var drinkhistory = [
    {
        time: new Date(2013, 5, 29, 20, 0, 0, 0),
        percent: 5.4,
        amount: 33
    },
    {
        time: new Date(2013, 5, 29, 20, 10, 0, 0),
        percent: 14.3,
        amount: 25
    },
    {
        time: new Date(2013, 5, 29, 20, 24, 0, 0),
        percent: 4.6,
        amount: 50
    },
    {
        time: new Date(2013, 5, 29, 20, 30, 0, 0),
        percent: 40,
        amount: 4
    },
    {
        time: new Date(2013, 5, 29, 21, 0, 0, 0),
        percent: 5.4,
        amount: 33
    }
];

(function() {
    var vars = {
        graph: null,
        ch: 300,
        cw: 400,
        personweight: 80,
        ismale: true,
        malefactor: 0.75,
        femalefactor: 0.66,
        margin: 10
    };
    
    var public = {
        init: function() {
            public.initEvents();
            var graphelem = document.getElementById("graph");
            vars.graph = graphelem.getContext("2d");
            vars.cw = graphelem.getAttribute("width");
            vars.ch = graphelem.getAttribute("height");
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
        },
                
        drawGraph: function() {
            var drinktable = [
                0,0,0,0,0,5,5,5,0,0,5,0,15,0,0,16.5
            ];
            
            drawGraph(alctable(drinktable));
        },
        
        
    };
    
    var drawGraph = function(table) {
        var g = vars.graph;
        g.clearRect(0,0,vars.cw,vars.ch);
        //crisp lines
        g.translate(0.5, 0.5);
        g.strokeStyle = "black";
        
        g.moveTo(0,vars.ch - vars.margin);
        for (var i = 0; i < table.length; i++) {
            g.lineTo(10 + i * 10, vars.ch - vars.margin - table[i] * 100 * (vars.ch - (2* vars.margin)));
        }
        g.stroke();
    };
    
    function alctable(purealcoholperminute) {
        var burnrateperminute = 0.015 * (1/60);
        var alcinblood = [];
        
        var waterinbody = vars.personweight;
        if (vars.ismale) {
            waterinbody *= vars.malefactor;
        } else {
            waterinbody *= vars.femalefactor;
        }
        
        var alcincrease = function(purealcohol) {
            //milliters of pure alcohol * blood factor * 10 (??) / milliliters of blood in person 
            return purealcohol * 1.055 * 10 / (waterinbody * 1000);
        };
        
        for (var i = 0; i < purealcoholperminute.length; i++) {
            //if no alc in blood and new alc consumed
            if (i > 0 && purealcoholperminute[i] == 0 && alcinblood[i-1] == 0) {
                alcinblood.push(0);
                continue;
            //if no alc consumed at 0 mins
            } else if (i == 0 && purealcoholperminute[i] == 0) {
                alcinblood.push(0);
                continue;
            }
            
            if (i > 0) {
                var newalc = alcinblood[i-1] + alcincrease(purealcoholperminute[i]);
            } else {
                var newalc = alcincrease(purealcoholperminute[i]);
            }
            
            var newval = newalc - burnrateperminute;
            if (newval < 0) {
                newval = 0;
            }
            alcinblood[i] = newval;
        }
        
        if (alcinblood[alcinblood.length-1] > 0) {
            while (true) {
                var nextminute = alcinblood[alcinblood.length-1] - burnrateperminute;
                if (nextminute < 0) {
                    break;
                }
                alcinblood.push(nextminute);
            }
        }
        
        return alcinblood;
    }
    
    
    
    kippis = public;
})();

$(document).ready(function() {
    kippis.init();
    kippis.drawGraph();
});

