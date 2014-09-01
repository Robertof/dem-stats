<?php
/**
 * Dem Stats engine
 * by Robertof
 * Licensed under the BSD-2 license.
 */

class StatsObject
{
    public $total_files;
    public $used_space;
    public $screenshots_per_month = array();
    public $screenshots_per_day = array();
}

class DemStats
{
    /**
     * Configuration
     */
    private $cfg_cache_file        = "cache.json";
    private $cfg_img_path          = "../sc"; // Where your images are stored.
    private $cfg_extensions        = "png,jpg"; // Extensions to scan.
    private $cfg_website_title     = "Robertof's Statistics";
    // Set to true if the script should check for deleted files.
    // Might cause slowness.
    private $cfg_check_deleted     = false;
    /**
     * End of configuration
     */
    private $stats;
    private $cache;

    public function __construct()
    {
        if (!file_exists ($this->cfg_cache_file))
            touch ($this->cfg_cache_file);
        if (!is_dir ($this->cfg_img_path))
            die ("\$cfg_img_path is not a directory, please fix the config");
        $this->stats = new StatsObject();
    }

    public function generateStats()
    {
        // read the cache file
        $this->cache = json_decode (file_get_contents ($this->cfg_cache_file), true);
        if (!is_array ($this->cache)) $this->cache = array();
        if (!isset ($this->cache['index'])) $this->cache['index'] = array();
        if (!isset ($this->cache['total'])) $this->cache['total'] = 0;
        if (!isset ($this->cache['size']))  $this->cache['size']  = 0;
        $edited = false;
        if (!isset ($this->cache['timecache']))
        {
            //print "No cache";
            $this->generateTimeInterval();
            $this->cache['timecache'] = array (
                "generated" => date ("d-m-Y"),
                "day" => $this->stats->screenshots_per_day,
                "month" => $this->stats->screenshots_per_month
            );
        }
        else
        {
            $today = date ("d-m-Y");
            $gen_month = false; $gen_day = false;
            if (substr ($today, 3) != substr ($this->cache['timecache']['generated'], 3))
                $gen_month = true;
            if ($today != $this->cache['timecache']['generated'])
                $gen_day = true;
            if ($gen_day || $gen_month)
            {
                $this->generateTimeInterval ($gen_month, $gen_day);
                //print "Generating timecache: [{$gen_month} / {$gen_day}]";
                $this->cache['timecache']['generated'] = $today;
                if ($gen_day)
                    $this->cache['timecache']['day'] = $this->stats->screenshots_per_day;
                else
                    $this->stats->screenshots_per_day = $this->cache['timecache']['day'];
                if ($gen_month)
                    $this->cache['timecache']['month'] = $this->stats->screenshots_per_month;
                else
                    $this->stats->screenshots_per_month = $this->cache['timecache']['month'];
                $edited = true;
            }
            else
            {
                $this->stats->screenshots_per_day   = $this->cache['timecache']['day'];
                $this->stats->screenshots_per_month = $this->cache['timecache']['month'];
            }
        }
        // $this->cache = array ( 'total' => n, 'size' => n, 'index' => array ('name' => date)) )
        $flist  = glob ("{$this->cfg_img_path}/*.{{$this->cfg_extensions}}", GLOB_BRACE);
        foreach ($flist as $file)
        {
            if (!isset ($this->cache['index'][$file]))
            {
                $edited = true;
                $_stat = stat ($file);
                $this->cache['index'][$file] = date ('d-m-Y', $_stat['mtime']) . '/' . $_stat['size'];
                $this->cache['size']  += $_stat['size'];
                $this->cache['total'] += 1;
            }
            $_date = substr ($this->cache['index'][$file], 0, strpos ($this->cache['index'][$file], '/'));
            $month = substr ($_date, 3);
            if (isset ($this->stats->screenshots_per_day[$_date]))
                $this->stats->screenshots_per_day[$_date]++;
            if (isset ($this->stats->screenshots_per_month[$month]))
                $this->stats->screenshots_per_month[$month]++;
        }
        if ($this->cfg_check_deleted)
        {
            foreach (array_diff (array_keys ($this->cache['index']), $flist) as $deleted)
            {
                $edited = true;
                $this->cache['size']  -= intval (substr ($this->cache['index'][$deleted], strpos ($this->cache['index'][$deleted], '/') + 1));
                $this->cache['total'] -= 1;
                unset ($this->cache['index'][$deleted]);
            }
        }
        $this->stats->total_files = $this->cache['total'];
        $this->stats->used_space  = $this->cache['size'];
        //print_r ($this->stats->screenshots_per_day);
        //print($edited);
        if ($edited)
            file_put_contents ($this->cfg_cache_file, json_encode ($this->cache));
        return $this;
    }

    // Thanks to http://stackoverflow.com/a/2510459
    public function formatBytes ($bytes, $precision = 2)
    { 
        $units = array ('B', 'KiB', 'MiB', 'GiB', 'TiB');
        $bytes = max ($bytes, 0);
        $pow = floor (($bytes ? log($bytes) : 0) / log (1024));
        $pow = min ($pow, count($units) - 1);
        $bytes /= pow (1024, $pow);
        return round ($bytes, $precision) . ' ' . $units[$pow];
    }

    // Getters
    public function getWebsiteTitle()
    {
        return $this->cfg_website_title;
    }

    public function getStats()
    {
        return $this->stats;
    }

    // Private stuff
    private function generateTimeInterval ($month = true, $day = true)
    {
        $start = date ('Y-m-01');
        for ($i = 0; $i < 30; $i++)
        {
            if ($month && $i <= 11)
                $this->stats->screenshots_per_month[date ('m-Y', strtotime ("$start -$i months"))] = 0;
            else if (!$day && $i > 11)
                break;
            if ($day)
                $this->stats->screenshots_per_day[date ('d-m-Y', strtotime ('-' . ($i+1) . ' days'))] = 0;
        }
        //print_r ($this->interval->day);
    }
}
$demstats = new DemStats();
$demstats->generateStats();
?>
<!DOCTYPE html>
<html>
    <head>
        <title><?=$demstats->getWebsiteTitle()?></title>
        <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Open+Sans" type="text/css">
        <link rel="stylesheet" href="css/normalize.css" type="text/css">
        <link rel="stylesheet" href="css/demstats.css" media="screen" type="text/css">
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
        <div id="container">
            <header>
                <?=$demstats->getWebsiteTitle()?>

                <div id="subtitle">proudly powered by <a href="https://github.com/Robertof/dem-stats">Dem Stats</a></div>
            </header>
            <div id="row-container">
                <div class="row">
                    <div class="row-text row-text-floated row-text-no-canvas">
                        Total screenshots
                    </div>
                    <div class="row-sub row-sub-floated row-sub-no-canvas">
                        <?=$demstats->getStats()->total_files?>

                    </div>
                </div>
                <hr class="spacer">
                <div class="row">
                    <div class="row-text row-text-floated row-text-no-canvas" style="margin-top: -25px">
                        Total space used by screenshots
                    </div>
                    <div class="row-sub row-sub-floated row-sub-no-canvas small">
                        <?=$demstats->formatBytes ($demstats->getStats()->used_space, 1)?>

                    </div>
                </div>
                <hr class="spacer">
                <div class="row row-chart">
                    <div class="row-text row-text-floated">
                        Screenshots uploaded per month
                    </div>
                    <div class="row-sub row-sub-floated">
                        <canvas id="monthChart" width="400" height="400"></canvas>
                    </div>
                    <div class="animation-overlay"></div>
                </div>
                <hr class="spacer">
                <div class="row row-chart">
                    <div class="row-text row-text-floated">
                        Screenshots uploaded per day
                    </div>
                    <div class="row-sub row-sub-floated">
                        <canvas id="dayChart" width="400" height="400"></canvas>
                    </div>
                    <div class="animation-overlay"></div>
                </div>
            </div>
        </div>
        <div style="display: none">
            <div id="chartdata-monthChart"><?=json_encode($demstats->getStats()->screenshots_per_month, JSON_HEX_TAG)?></div>
            <div id="chartdata-dayChart"><?=json_encode($demstats->getStats()->screenshots_per_day, JSON_HEX_TAG)?></div>
        </div>
        <span id="isSmallScreen"></span>
        <script type="application/javascript">
        var chartData = {
            monthChart: <?=json_encode($demstats->getStats()->screenshots_per_month)?>,
            dayChart: <?=json_encode($demstats->getStats()->screenshots_per_day)?>

        };
        </script>
        <script src="//code.jquery.com/jquery-2.0.3.min.js" type="application/javascript"></script>
        <script src="js/jquery-ui-1.10.3.custom.min.js" type="application/javascript"></script>
        <script src="js/jquery.inview.min.js" type="application/javascript"></script>
        <script src="js/Chart.min.js" type="application/javascript"></script>
        <script src="js/demstats.js" type="application/javascript"></script>
    </body>
</html>
