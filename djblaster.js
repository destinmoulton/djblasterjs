/**
 * djblaster.js
 * 
 * @author Destin Moulton
 * @license MIT
 * @copyright 2015
 * 
 * AngularJS frontend application for DJBlaster.
 *   - timerService sets an interval to fire on the hour
 *     emmitting event calls to query the server for the
 *     next set of ads to display.
 * 
 *   - There are three types of ads, each with their own
 *     corresponding controller.
 *        - Events (adEventCtrl)
 *        - Show sponsorships (adShowSponsorshipCtrl)
 *        - PSAs (adPSACtrl)
 * 
 *   - readitModalCtrl controls the modal window when
 *     a DJ clicks that they have Read an ad.
 * 
 *   - debugCtrl is a controller that gives a powerful set of
 *     debug features, allowing the simulation of hours changing
 */
var DEBUG = {
    'active': true,
    'currentDateObj': new Date()
};

var djblasterModule = angular.module('djblasterApp', [])
                             .constant('djblasterConfig', {
                                 'adEvent':{
                                     // Configure the start and end time to get ad events
                                     // 24 hour format
                                     'start_hour':7,
                                     'end_hour':21
                                 }
                             });

/**
 * Start the timer interval to begin querying the server.
 */
djblasterModule.run(['timerService', function (timerService) {
    timerService.startInterval();
}]);

/**
 * Show Sponsorship ad controller.
 *  - Get next show sponsorship from server
 *  - Setup Read event handler
 */
djblasterModule.controller('adShowSponsorshipCtrl',
    ['$scope', '$http', 'timerService', 'readitService',
        function ($scope, $http, timerService, readitService) {
            $scope.show_sponsorships = false;
            $scope.$on('getShowSponsorshipsFromServer', function (event, args) {

                var options = {
                    'current_hour': timerService.getCurrentHour(),
                    'current_time': timerService.getCurrentTimestamp()
                };

                $http.post(BASE_URL + '/ajax/get-show-sponsorships', options).
                    success(function (data, status, headers, config) {
                        $scope.show_sponsorships = angular.fromJson(data);
                    }).
                    error(function (data, status, headers, config) {
                        // TODO: Add error handler.
                        console.log("Failed to acquire Show Sponsorships from server.");
                    });
            });

            /**
             * Read button click event handler.
             */
            $scope.readitClicked = function (idButtonClicked) {
                readitService.initializeData(idButtonClicked);
            };

            $scope.renderHTML = function (e) {
                return $(e).html();
            };
        }
    ]
);

/**
 * Event ad controller
 *  - Get the next Event ad from the server
 *  - Setup the the Read event handler
 */
djblasterModule.controller('adEventCtrl',
    ['$scope', '$http', 'readitService', 'timerService', 'djblasterConfig',
        function ($scope, $http, readitService, timerService, djblasterConfig) {
            $scope.events = false;
            $scope.$on('getEventsFromServer', function (event, args) {
                $scope.events = false;

                var isAfterStartHour = timerService.getCurrentHour() >= djblasterConfig.adEvent.start_hour; 
                var isBeforeEndHour = timerService.getCurrentHour() <= djblasterConfig.adEvent.end_hour;
                if(isAfterStartHour && isBeforeEndHour){
                    var postOptions = {
                        'current_time': timerService.getCurrentTimestamp(),
                        'current_hour': timerService.getCurrentHour(),
                        'start_hour': djblasterConfig.adEvent.start_hour,
                        'end_hour': djblasterConfig.adEvent.end_hour
                    };

                    $http.post(BASE_URL + '/ajax/get-events', postOptions).
                        success(function (data, status, headers, config) {
                            $scope.events = angular.fromJson(data);
                        }).
                        error(function (data, status, headers, config) {
                            // TODO: Add error handler.
                            console.log("Failed to acquire Events from server.");
                        });
                }
            });

            /**
             * Read button click event handler.
             */
            $scope.readitClicked = function (idButtonClicked) {
                readitService.initializeData(idButtonClicked);
            };
        }
    ]
);

/**
 * PSA ad controller
 *  - Get the next PSA from the server
 *  - Setup the Read event handler
 *  - Setup the Skip PSA event handler
 */
djblasterModule.controller('adPSACtrl',
    ['$scope', '$http', 'readitService', 'timerService',
        function ($scope, $http, readitService, timerService) {
            $scope.psas = false;
            $scope.$on('getPSAsFromServer', function (event, args) {
                $scope.psas = false;

                var options = { 'current_time': timerService.getCurrentTimestamp() };

                $http.post(BASE_URL + '/ajax/get-psas', options).
                    success(function (data, status, headers, config) {
                        $scope.psas = angular.fromJson(data);
                    }).
                    error(function (data, status, headers, config) {
                        // TODO: Add error handler
                        console.log("Failed to acquire PSA from server.");
                    });
            });

            /**
             * Read button click event handler.
             */
            $scope.readitClicked = function (idButtonClicked) {
                readitService.initializeData(idButtonClicked);
            };

            /**
             * Skip PSA button click handler.
             */
            $scope.skipitClicked = function (psaId) {
                var options = {};
                $http.post(BASE_URL + '/ajax/skip-psa/' + psaId, options).
                    success(function (data, status, headers, config) {
                        //Get the next PSA from the server
                        $scope.$broadcast('getPSAsFromServer');
                    }).
                    error(function (data, status, headers, config) {
                        // TODO: Add error handler.
                        console.log("Failed to acquire PSAs from server after Skip.");
                    });
            };
        }
    ]
);

/**
 * Read It Modal controller.
 *  - Clear and setup the DJ initial form in the modal
 */
djblasterModule.controller('readitModalCtrl',
    ['$scope', 'readitService',
        function ($scope, readitService) {
            $scope.init = function () {
                // Focus on DJ initials input when the modal opens 
                $('#readItModal').on('shown.bs.modal', function () {
                    $('#inputDJInitials').focus();
                });

                // Setup the enter-to-submit event on the initials input 
                $('#inputDJInitials').keypress(function (e) {
                    if (e.which == 13) {
                        $scope.submitClicked();
                    }
                });
            };

            //Modal form submitted
            $scope.submitClicked = function () {
                //Change the submit button text and disable it
                var submitButton = $('#readItSubmitButton');
                submitButton.prop('disabled', true);
                submitButton.html('Submitting...');

                var djInitials = $('#inputDJInitials').val();

                if (djInitials == '') {
                    //No initials so don't submit
                    $('#readitFormGroup').addClass('has-error');
                    return false;
                }

                $('#readitFormGroup').removeClass('has-error');
                readitService.readitToServer(djInitials);
            };

            $scope.init();
        }
    ]
);

/**
 * Debug bar controller.
 */
djblasterModule.controller('debugCtrl',
    ['$scope', 'timerService',
        function ($scope, timerService) {
            $scope.debugActive = DEBUG.active;
            $scope.currentDateObj = DEBUG.currentDateObj; // Object reference
            $scope.currentHour = $scope.currentDateObj.getHours();
            $scope.currentDate = $scope.currentDateObj.toDateString();

            $scope.incrementDate = function () {
                $scope.currentDateObj.setDate($scope.currentDateObj.getDate() + 1);
                $scope.currentDateObj.setHours(7);
                $scope.pgmChangeDate();
            };

            $scope.decrementDate = function () {
                $scope.currentDateObj.setDate($scope.currentDateObj.getDate() - 1);
                $scope.currentDateObj.setHours(7);
                $scope.pgmChangeDate();
            };

            $scope.pgmChangeDate = function () {
                if ($scope.currentDate != $scope.currentDateObj.toDateString() &&
                    $scope.currentHour === $scope.currentDateObj.getHours()) {
                    // Day has changed, but hour has remained the same
                    // This cleans up the calls so only one call is made
                    timerService.broadcast();
                }

                $scope.currentDate = $scope.currentDateObj.toDateString();
                $scope.currentHour = $scope.currentDateObj.getHours();
            };

            $scope.incrementHour = function () {
                $scope.currentDateObj.setHours($scope.currentDateObj.getHours() + 1);
                $scope.currentDateObj.setMinutes(0);
                $scope.currentDateObj.setSeconds(0);
                $scope.pgmChangeHour();
            };

            $scope.decrementHour = function () {
                $scope.currentDateObj.setHours($scope.currentDateObj.getHours() - 1);
                $scope.currentDateObj.setMinutes(0);
                $scope.currentDateObj.setSeconds(0);
                $scope.pgmChangeHour();
            };

            $scope.pgmChangeHour = function () {
                $scope.currentHour = $scope.currentDateObj.getHours();
            };
        }
    ]
);

/**
 * Read It service
 *  - Resets the modal DJ initial form
 *  - POST the Read to the server
 *  - Broadcast that a read has been performed so the
 *    corresponding next ad is acquired from the server.
 */
djblasterModule.factory('readitService', 
    ['$http', '$rootScope', 'timerService',
        function ($http, $rootScope, timerService) {
            var self = this;
            self.currentAdType = '';
            self.currentAdId = 0;

            self.initializeData = function (idButtonClicked) {

                var jButton = $('#' + idButtonClicked);

                self.currentAdType = jButton.data('ad_type');
                self.currentAdId = jButton.data('ad_id');
            };

            self.resetData = function () {
                //Reset the modal form
                $('#inputDJInitials').val('');

                $('#readitFormGroup').removeClass('has-error');

                var submitButton = $('#readItSubmitButton');
                submitButton.prop('disabled', false);
                submitButton.html('Submit');

                self.currentAdType = '';
                self.currentAdId = '';
            };

            self.readitToServer = function (djInitials) {

                var url = BASE_URL + '/ajax/dj-read/' + self.currentAdType + '/' + self.currentAdId;

                var options = {
                    'dj_initials': djInitials,
                    'current_time': timerService.getCurrentTimestamp(),
                    'current_hour': timerService.getCurrentHour()
                };
                $http.post(url, options).
                    success(function (data, status, headers, config) {
                        if (self.currentAdType == 'psa') {
                            $rootScope.$broadcast('getPSAsFromServer');
                        } else if (self.currentAdType == 'event') {
                            $rootScope.$broadcast('getEventsFromServer');
                        } else if (self.currentAdType == 'show-sponsorship') {
                            // Put the well style on it
                            $('#ad-' + self.currentAdType + '-' + self.currentAdId).addClass('well');
                        }

                        self.resetData();

                        //close the modal window
                        $('#readItModal').modal('toggle');
                    }).
                    error(function (data, status, headers, config) {

                        console.log("failed");
                    });

            };
            return self;
        }
    ]
);

/**
 * Emit the callServer broadcast when the 
 * hour changes.
 *  
 */
djblasterModule.factory('timerService', 
    ['$interval', '$rootScope',
        function ($interval, $rootScope) {
            var self = this;

            self.currentHour = false;
            self.timerIntervalMs = 1000;
            self.timerObj = {};
            self.startInterval = function () {

                self.timerObj = $interval(function () {
                    self.checkTime();
                }, self.timerIntervalMs);
            };

            self.getCurrentTimestamp = function () {
                if (DEBUG.active) {
                    return Math.floor(DEBUG.currentDateObj.getTime() / 1000);
                } else {
                    return Math.floor(new Date().getTime() / 1000);
                }
            };

            self.getCurrentHour = function () {

                if (DEBUG.active) {
                    return DEBUG.currentDateObj.getHours();
                } else {
                    var date = new Date();
                    return date.getHours();
                }
            };

            self.checkTime = function () {
                var hour = self.getCurrentHour();

                // Is this a first load or has the hour changed? 
                if (self.currentHour === false || hour != self.currentHour) {

                    // Set current hour
                    self.currentHour = hour;

                    // Broadcast to the controllers to acquire server data
                    self.broadcast();
                }
            };

            self.broadcast = function () {
                //Emit the broadcast to for initial set of server calls    
                $rootScope.$broadcast('getShowSponsorshipsFromServer');
                $rootScope.$broadcast('getEventsFromServer');
                $rootScope.$broadcast('getPSAsFromServer');
            };


            return self;
        }
    ]
);

/**
 * unsaftenHTML filter
 * A filter to tell angular that the passed html is safe.
 * 
 * Used to display HTML from the server.
 */
djblasterModule.filter('unsaftenHTML', function ($sce) {
    return $sce.trustAsHtml;
});
