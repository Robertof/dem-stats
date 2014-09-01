(function (DemStats) {
    var MONTHS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
        _header = {
            basePos:          0,
            lastX:            0,
            lastY:            0,
            animating:        false,
            mouseInteracting: false,
        }, _drawnGraphs = {};
    DemStats.onPageReady = function() {
        var $header = $("header"), $window = $(window);
        // Parallax
        _updateHeaderBasePosition();
        // Events
        $("canvas").click (_onCanvasClicked);
        $header.mousemove (_onHeaderMouseMove).mouseout (_onHeaderMouseOut);
        $window.scroll (_onWindowScroll).resize (_updateHeaderBasePosition);
        if ($("#isSmallScreen").is (":visible"))
        {
            _drawGraphs ("monthChart", "dayChart");
            // ensure that the animation overlays are hidden
            $(".animation-overlay").hide();
        }
        else
        {
            $("#monthChart").on ("inview", function() {
                // for some reason using directly _onCanvasViewed
                // as the callback does not work
                _onCanvasViewed.call (this);
            });
            $("#dayChart").on ("inview", _onCanvasViewed);
        }
    };
    function _onCanvasClicked()
    {
        var $this = $(this), $parent = $this.parent();
        // toggle the "-floated" class for each sibling of the canvas container
        $parent.siblings ("div[class^='row']").add ($parent).each (function() {
            var $sibling = $(this);
            $sibling.toggleClass (
                $sibling.attr ("class").indexOf ("sub") != -1 ?
                    "row-sub-floated" :
                    "row-text-floated",
                400
            );
        });
        var old_size  = $this.width(),
            new_size  = old_size == 400 ? 600 : 400;
        $this.attr ({ width: new_size, height: new_size });
        _drawGraphs ({ id: $this.attr ("id"), size: new_size });
        $this.css ({ width: old_size, height: old_size }).animate ({
            width: new_size,
            height: new_size
        }, {
            duration: 1000,
            complete: function() {
                var $win    = $(window),
                    wtop    = $win.scrollTop(),
                    wbottom = wtop + $win.height(),
                    ctop    = $this.offset().top,
                    cbottom = ctop + new_size;
                // perform the scroll animation ONLY if the canvas is not
                // visible.
                // we check if the canvas is visible knowing that
                // scrollTop() is the highest part of the viewport, and
                // scrollTop() + height() is the lowest part of the viewport.
                // we can then check if the highest part of the viewport is
                // less than the top of the canvas or if the lowest part of the
                // viewport is bigger than the top of the canvas. repeat with
                // the bottom of the canvas (by adding the canvas size to the
                // top) and boom
                if (new_size == 600 && (wtop > ctop || wbottom < ctop ||
                    wtop > cbottom || wbottom < cbottom))
                    $("html, body").animate ({
                        scrollTop: $parent.prev().offset().top
                    }, 500);
            }
        });
    }
    function _onCanvasViewed()
    {
        // So I had to use a different method to animate the things
        // because my Firefox has rendering problems with 'opacity' and
        // canvas elements. It's painful.
        var $chart = $(this).off ("inview");
        $chart.parents (".row-chart").find (".animation-overlay").animate ({
            backgroundColor: "transparent"
        }, 500, function() {
            $(this).hide();
        });
        setTimeout (function() {
            _drawGraphs ($chart.attr ("id"));
        }, 100);
    }
    function _onHeaderMouseMove (evt)
    {
        _header.animating = false, _header.mouseInteracting = true;
        var $header       = $("header"),
            viewableSizeX = 2000 - $(window).width(),
            viewableSizeY = 1000 - $header.outerHeight(),
            multiplierX   = evt.pageX < _header.lastX ? -1 : 1,
            multiplierY   = evt.pageY < _header.lastY ? -1 : 1,
            bgposition    = _parseBgPosition ($header),
            newX          = bgposition.x + (2 * multiplierX),
            newY          = bgposition.y + (3 * multiplierY);
        if (newX > 0 || newX < -viewableSizeX) newX = bgposition.x;
        if (newY > 0 || newY < -viewableSizeY) newY = bgposition.y;
        if (newX != bgposition.x || newY != bgposition.y)
            $header.css ("background-position", newX + "px " + newY + "px");
        _header.lastX = evt.pageX, _header.lastY = evt.pageY;
    }
    function _onHeaderMouseOut()
    {
        _header.mouseInteracting = false;
        _restoreHeaderPosition.call (this);
    }
    function _onWindowScroll()
    {
        var $header = $("header"), $win = $(window), pos;
        if (_header.animating || _header.mouseInteracting ||
            $win.scrollTop() > $header.outerHeight())
            return;
        pos = _parseBgPosition ($header);
        $header.css ("background-position",
            pos.x + "px -" + ($win.scrollTop() / 2) + "px");
    }
    function _drawGraphs()
    {
        for (var i = 0; i < arguments.length; i++)
        {
            var size = 400, id = arguments[i];
            if (typeof id === "object")
                size = id.size, id = id.id;
            if (id in _drawnGraphs)
                Chart.instances[_drawnGraphs[id]].destroy();
            var data   = chartData[id], c = 0,
                labels = [], values = [];
            for (var key in data)
            {
                if (!data.hasOwnProperty (key)) continue;
                if (/month/.test (id))
                    // 01-2014 -> 01 -> MONTHS[0] -> January
                    labels.unshift (MONTHS[parseInt (key.substr (0, 2)) - 1]);
                else
                    labels.unshift (key.substr (0, 2));
                values.unshift (data[key]);
                if (++c >= 13 && size != 600) break;
            }
            var result = {
                labels: labels,
                datasets: [
                    {
                        fillColor:   "rgba(151,187,205,0.5)",
                        strokeColor: "rgba(151,187,205,1)",
                        pointColor:  "rgba(151,187,205,1)",
                        pointStrokeColor: "#fff",
                        data: values
                    }
                ]
            };
            _drawnGraphs[id] = new Chart ($("#" + id).get(0).getContext ("2d"))
                .Line (result).id;
        }
    }
    function _parseBgPosition ($elm)
    {
        var ps = $elm.css ("background-position").split (" ").map (function(v){
            return parseInt (v.replace (/%|px/, ""), 10);
        });
        return {
            x: ps[0],
            y: ps[1]
        };
    }
    function _updateHeaderBasePosition()
    {
        _header.basePos = -Math.round ((2000 - $(window).width()) / 2);
        $("header").css ("background-position", _header.basePos + "px 0");
    }
    function _restoreHeaderPosition()
    {
        var $this = $(this), pos = _parseBgPosition ($this);
        if (pos.x === _header.basePos && pos.y === 0) return;
        var $pos = $(pos);
        _header.animating = true;
        // Yes. I'm animating an object.
        $pos.animate ({ x: _header.basePos, y: 0 }, {
            duration: 500,
            step: function() {
                if (!_header.animating)
                    return $pos.stop();
                $this.css ("background-position",
                    this.x + "px " + this.y + "px");
            },
            complete: function() {
                // ensure that the final position is the one we want
                $this.css ("background-position", _header.basePos + "px 0");
                _header.animating = false;
            }
        });
    }
}(window.DemStats = window.DemStats || {}));

$(document).ready (DemStats.onPageReady);
