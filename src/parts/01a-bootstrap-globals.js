//
// This script forked from TMVictor's script version 3.3.1. Original script: https://gist.github.com/TMVictor/3f24e27a21215414ddc68842057482da
//
// Most of script options have tooltips, explaining what they do, read them if you have a questions.
//
// Here's some tips about non-intuitive features:
//   Script tends to do a lot of clicks. It highly recommended to have key multipliers enabled, and bound to Shift\Control\Alt\Meta keys(in any combinations) for best performance.
//   Ctrl+Click on almost any script option brings up advanced configurations, which allows to overide setting under certain conditions and set more advanced logic.
//     Triggers, evolution queue, log filters, smart powering for interlinked buildings(like transport and bireme), priorities(draggables), and overrides itself - cannot be overridden.
//     Overrides affects only script behaviour, GUI(outside of overrides modal) always show and changes default values.
//   autoMarket, autoGalaxyMarket, autoFactory, and autoMiningDroid use weightings and priorities to determine their tasks. Resources split by groups of same priority, and then resources within group having the best priority distributed according to their weights. If there's still some more unused routes\factories\drones after assigning, script moves to next group with lower priority, etc. In most cases only one group with highest priority is active and working, while other groups serve as fallback for cases when all resources with better priority are either capped, or, in case of factory, unaffordable. There's few special values for finer configuration:
//     Prioritization(queue, trigger, etc) does temporarily change priority of resource to 100, thus resources with priority above 100 won't be affected by prioritization.
//       You can also disable prioritization under General Settings, if you can't cope with it.
//     Priority of -1 it's special supplementary value meaning "same as current highest". Resources with this value will always be crafted among with whatever currently have highest priority, without disabling them.
//     Resources with 0 priority won't be crafted during normal workflow, unless prioritized(which increases priority).
//     Resources with 0 weighting won't ever be crafted, regardless of configured priority or prioritization.
//     autoMarket and autoFactory also have separate global checkboxes per resources, when they disabled(both buying and selling in case of autoMarket) - script won't touch them, leaving with whatever was manually set.
//   Added numbers in Mech Labs represents: design efficiency, real mech damage affected by most factors, and damage per used space, respectively. For all three - bigger numbers are better. Collectors show their supply collect rate.
//   Buildings\researches queue, triggers, and available researches prioritize missing resources, overiding other script settings. If you have issues with factories producing not what you want, market buying not what you want, and such - you can disable this feature under general settings.
//     Alternatively you may try to tweak options of producing facilities: resources with 0 weighting won't ever be produced, even when script tries to prioritize it. And resources with priority -1 will always have highest available priority, even when facility prioritizing something else. But not all facilities can be configured in that way.
//   Auto Storage assigns crates\containers to make enough storage to build all buildings with enabled Auto Build.
//     If some storage grew too high, taking all crates, you can disable expensive building, and Auto Storage won't try to fullfil its demands anymore. If you want to expand storage to build something manually, you can limit maximum level of building to 0, thus while it technically have auto build enabled, it won't ever be autobuilded, but you'll have needed storage.
//   Order in which buildings receive power depends on order in buildings settings, you can drag and drop them to adjust priorities.
//     Filtering works with names, some settings, and resource cost. E.g. you can filter for "build==on", "power==off", "weight<100", "soul gem>0", "iron>=1G" and such.
//     By default Ascension Trigger placed where it can be activated as soon as possible without killing soldiers or population, and reducing prestige rewards. But it still can hurt production badly. If you're planning to ascend at very first opportunity(i.e. not planning to go for pillar or such), you may enable auto powering it. Otherwise you may want to delay with it till the moment when you'll be ready. (Or you can just move it where it will be less impacting on production, but that also means it'll take longer to get enough power)
//     Auto Power have two toggles, first one enables basic management for building: based on priority, available power, support, and fuel. Logic behind second toggle is individual per building, but generally it tries to behave smart and save resources when it's enabled.
//   Evolution Queue can change any script settings, not only those which you have after adding new task, you can append any variables and their values manually, if you're capable to read code, and can find internal names and acceptable values of those variables. Settings applied at the moment when new evolution starts. (Or right before reset in case of Cataclysm)
//     Unavailable tasks in evolution queue will be ignored, so you can queue something like salamander and balorg, one after another, and configure script to pick either volcano or hellscape after bioseed. And, assuming you'll get either of these planets, it'll go for one of those two races. (You can configure more options to pick from, if you want)
//   Auto Smelter does adjust rate of Inferno fuel and Oil for best cost and efficiency, but only when Inferno directly above oil.
//   All settings can be reset to default at once by importing {} as script settings.
//   Autoclicker can trivialize many aspects of the game, and ruin experience. Spoil your game at your own risk!
//   Use of some advanced features to run your own custom code can cause the game to freeze on load if you add an infinite loop. Add ?safemode to the game's URL to temporarily deactivate script processing while still allowing access to configuration.

(function($) {
    'use strict';
    var settingsRaw = JSON.parse(localStorage.getItem('settings')) ?? {};
    var settings = {};
    var game = null;
    var win = null;
    var needSandboxBypass = false;

    var overrideKey = "ctrlKey";
    var overrideKeyLabel = "Ctrl";
    if (window.navigator.platform.indexOf("Mac") === 0) {
        overrideKey = "altKey";
        overrideKeyLabel = "Alt";
    }

    var checkActions = false;

    // Displayed in error handler. Please change this if you publish a forked version of the script.
    const SCRIPT_VERSION_EXTRA = "[Vollch]";

    const CONSUMPTION_BALANCE_MIN = 60; // Seconds of used resources to keep
    const CONSUMPTION_BALANCE_TARGET = 120; // Seconds of used resources to try producing

    let safeMode = String(window.location).toLowerCase().indexOf("safemode") !== -1;

    // Class definitions

