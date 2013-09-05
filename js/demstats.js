var DemStats = {
    baseHeaderPos: 0,
    intervalRunning: false,
    mouseInteracting: false,
    header_lastX: 0,
    header_lastY: 0,
    months: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
    onPageReady: function() {
        var header = $("header"), win = $(window);
        // Parallax positioning
        DemStats.baseHeaderPos = -Math.round ((2000 - $(window).width()) / 2);
        header.css ('background-position', DemStats.baseHeaderPos + 'px 0');
        // Chart management
        //DemStats._drawGraph ("monthChart");
        //DemStats._drawGraph ("dayChart");
        // Events
        $("canvas").click (DemStats._onCanvasClick);
        if (!$("#isSmallScreen").is (":visible"))
        {
            $("#monthChart").on ("inview", function() { DemStats._onCanvasViewed.call (this); });
            $("#dayChart").on ("inview", function() { DemStats._onCanvasViewed.call (this); });
        } else {
            $(".row-chart").css ({ opacity: 1 });
            DemStats._drawGraph ("monthChart");
            DemStats._drawGraph ("dayChart");
        }
        header.mousemove (DemStats._onHeaderMouseMove);
        header.mouseout (DemStats._onHeaderMouseOut);
        win.scroll (DemStats._onWindowScroll);
        win.resize (DemStats._onWindowResize);
    },
    // Events
    _onCanvasClick: function() {
        var myself = $(this);
        myself.parent().parent().find ("div").each (function() {
            var elm = $(this);
            if (elm.attr ('class').indexOf ("sub") > -1)
                elm.toggleClass ("row-sub-floated", 400);
            else
                elm.toggleClass ("row-text-floated", 400);
        });
        var old  = myself.width(),
            flag = old == 400 ? "600px" : "400px";
        DemStats._drawGraph (myself.attr ('id'), flag.replace ("px", ""));
        myself.width (old); myself.height (old);
        myself.animate ({ width: flag, height: flag }, 1000);
    },
    _onCanvasViewed: function() {
        var chart = $(this);
        chart.off ("inview");
        chart.parent().parent().animate ( { opacity: 1 }, 1000);
        setTimeout (function() {
            DemStats._drawGraph (chart.attr ('id'));
        }, 250);
    },
    _onHeaderMouseMove: function (evt) {
        if (DemStats.intervalRunning)
            DemStats.intervalRunning = false;
        DemStats.mouseInteracting = true;
        var pos           = DemStats._parseBgPosition ($("header").css ('background-position')),
            viewableSizeX = 2000 - $(window).width(),
            viewableSizeY = 1000 - $("header").outerHeight(),
            multiplierX   = 0,
            multiplierY   = 0;
        if (evt.pageX < DemStats.header_lastX) multiplierX = -1;
        else if (evt.pageX > DemStats.header_lastX) multiplierX = 1;
        if (evt.pageY < DemStats.header_lastY) multiplierY = -1;
        else if (evt.pageY > DemStats.header_lastY) multiplierY = 1;
        var newXPos = pos.x + (2 * multiplierX),
            newYPos = pos.y + (3 * multiplierY);
        if (newXPos > 0 || newXPos < -viewableSizeX)
            newXPos = pos.x;
        if (newYPos > 0 || newYPos < -viewableSizeY)
            newYPos = pos.y;
        if (newXPos != pos.x || newYPos != pos.y)
            $("header").css ('background-position', newXPos + "px " + newYPos + "px");
        DemStats.header_lastX = evt.pageX;
        DemStats.header_lastY = evt.pageY;
    },
    _onHeaderMouseOut: function() {
        DemStats.mouseInteracting = false;
        DemStats._simulateSmoothPositionChange ($(this), DemStats.baseHeaderPos);
    },
    _onWindowScroll: function() {
        var header = $("header");
        if (DemStats.intervalRunning || DemStats.mouseInteracting || $(window).scrollTop() > $("header").outerHeight())
            return;
        var pos = DemStats._parseBgPosition (header.css ('background-position'));
        header.css ('background-position', pos.x + 'px -' + ($(window).scrollTop() / 2) + 'px');
    },
    _onWindowResize: function() {
        DemStats.baseHeaderPos = -Math.round ((2000 - $(window).width()) / 2);
        //DemStats._simulateSmoothPositionChange ($("header"), DemStats.baseHeaderPos);
        $("header").css ('background-position', DemStats.baseHeaderPos + 'px 0');
    },
    // Misc functions
    _drawGraph: function (id, size) {
        var plain = JSON.parse ($("#chartdata-" + id).text()), _labels = [], _values = [], counter = 0;
        for (var key in plain)
        {
            if (!plain.hasOwnProperty (key)) continue;
            if (id == "dayChart")
                _labels.push (key.substr (0, 2));
            else
                _labels.push (DemStats.months[parseInt (key.substr (0, 2)) - 1]);
            _values.push (plain[key]);
            if (++counter >= 13 && size != 600) break;
        }
        _labels.reverse(); _values.reverse();
        var data = {
            labels: _labels,
            datasets: [
                {
                    fillColor: "rgba(151,187,205,0.5)",
                    strokeColor: "rgba(151,187,205,1)",
                    pointColor:  "rgba(151,187,205,1)",
                    pointStrokeColor: "#fff",
                    data: _values
                }
            ]
        };
        new Chart ($("#" + id).get (0).getContext ("2d"), size).Line (data);
    },
    _parseBgPosition: function (pos) {
        var _arr = pos.split (' ');
        return { x: parseInt (_arr[0].replace (/%|px/, '')), y: parseInt (_arr[1].replace (/%|px/, '')) };
    },
    _getSmoothSubtractor: function (pos, base, step) {
        return ( pos > base ? ( pos < step ? -1 : -step ) : ( pos > -step ? -pos : step ));
    },
    _simulateSmoothPositionChange: function (element, baseX) {
        var pos = this._parseBgPosition (element.css ('background-position'));
        if (pos.x == baseX && pos.y == 0) return; // nothing to do
        this.intervalRunning = true; // if set to false, the interval will stop running, for user interaction
        var handler = setInterval (function() {
            if (!DemStats.intervalRunning || (pos.x == baseX && pos.y == 0))
            {
                clearInterval (handler);
                DemStats.intervalRunning = false;
                return;
            }
            if (pos.x != baseX)
                pos.x += DemStats._getSmoothSubtractor (pos.x, baseX, 2);
            if (pos.y != 0)
                pos.y += DemStats._getSmoothSubtractor (pos.y, 0, 3);
            element.css ('background-position', pos.x + 'px ' + pos.y + 'px');
        }, 5);
    }
};

$(document).ready (DemStats.onPageReady);