/**
 * Sample Roam App
 * @format
 * @flow strict-local
 */

import AsyncStorage from '@react-native-community/async-storage';
import DeviceInfo from 'react-native-device-info';
import React, {
  useState,
  useEffect,
  useReducer,
  useRef,
  useCallback,
} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  Alert,
  AppState,
  Platform,
  TextInput
} from 'react-native';

import Roam from 'roam-reactnative';
import {Button, TextField, Loader} from './components';
import {roam} from './services';
import { RadioGroup } from 'react-native-radio-buttons-group';
import CheckBox from '@react-native-community/checkbox';
import RNFetchBlob from 'react-native-fetch-blob';

const App: () => React$Node = () => {

  //States
  const appStateRef = useRef(AppState.currentState);
  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState();
  const [tripId, setTripId] = useState();
  const [loadedUserId, setLoadedUserId] = useState();
  const [trackingStatus, setTrackingStatus] = useState();
  const [tripTrackingStatus, setTripTrackingStatus] = useState('Unknown');
  const [eventStatus, setEventStatus] = useState('Unknown');
  const [listenerStatus, setListenerStatus] = useState('Unknown');
  const [subscriptionStatus, setSubscriptionStatus] = useState('-');
  const [tripSubscriptionStatus, setTripSubscriptionStatus] = useState('-');
  const [tripSummaryStatus, setTripSummaryStatus] = useState('-');
  const [distanceCovered, setDistanceCovered] = useState('-');
  const [duration, setDuration] = useState('-');
  const [elevationGain, setElevationGain] = useState('-');
  const [routeCount, setRouteCount] = useState('-');
  const [listenUpdatesStatus, setListenUpdatesStatus] = useState('-');
  const [listenUpdatesTripStatus, setTripListenUpdatesStatus] = useState('-');
  const [updateCoutner, setUpdateCounter] = useState(0);
  const [tripUpdateCoutner, setTripUpdateCounter] = useState(0);
  const [tripListener, setTripListener] = useState('');
  const [tripResponse, setTripResponse] = useState('');
  const [tripSummaryResponse, setTripSummaryResponse] = useState('')
  

  // Permissions
  const [permissions, setPermissions] = useReducer(
    (state, update) => ({
      ...state,
      ...update,
    }),
    {
      location: '',
      backgroundLocation: '',
      locationServices: '',
      backgroundLocationNeeded: null,
      locationServicesNeeded: null,
    },
    state => state,
  );

  const trackingSourceRadioData = [{
    id: '1',
    label: 'ALL',
    value: 'ALL'
  },{
    id: '2',
    label: 'LAST_KNOWN',
    value: 'LAST_KNOWN'
  },{
    id: '3',
    label: 'GPS',
    value: 'GPS'
  }]

  const [sourceRadioButtons, setSourceRadioButtons] = useState(trackingSourceRadioData)
  const [discardLocation, setDiscardLocation] = useState(true)
  const [trackingConfigResponse, setTrackingConfigResponse] = useState('')
  const [trackingAccuracy, setTrackingAccuracy] = useState('10')
  const [trackingTimeout, setTrackingTimeout] = useState('10')
  const [selectedSource, setSelectedSource] = useState({value: 'ALL'})
  const [trackingMode, setTrackingMode] = useState('ACTIVE')
  const [timeInterval, setTimeInterval] = useState('5')
  const [distanceInterval, setDistanceInterval] = useState('10')
  const [stationaryInterval, setStationaryInterval] = useState('0')
  const [stopDuration, setStopDuration] = useState('20')
  const [accuracyFilter, setAccuracyFilter] = useState('5')
  const [batchResponse, setBatchResponse] = useState('')
  const [batchCount, setBatchCount] = useState('')
  const [batchWindow, setBatchWindow] = useState('')
  const [networkState, setNetworkState] = useState(Roam.NetworkState.BOTH)

  //Initial configuration
  useEffect(() => {
    if (!initialized) {
      //Get stored userId
      AsyncStorage.getItem('userId').then(savedId => {
        setUserId(savedId);
        setInitialized(true);
      });
      //Get stored userId
      AsyncStorage.getItem('tripId').then(savedId => {
        setTripId(savedId);
        setInitialized(true);
      });
      // Default roam configuration
      if (Platform.OS === 'android') {
        Roam.allowMockLocation(true);
      }
      Roam.enableAccuracyEngine();
      onCheckPermissions();
    } 
      
   
  }, [initialized, onCheckPermissions, setUserId, setTripId]);

  // Refresh permissions on app state change
  useEffect(() => {
    const handleAppStateChange = nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        onCheckPermissions();
      }
      appStateRef.current = nextAppState;
    };
    AppState.addEventListener('change', handleAppStateChange);
    return () => {
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [onCheckPermissions]);


  //Check Permission
  const onCheckPermissions = useCallback(async () => {
    let {locationServicesNeeded, backgroundLocationNeeded} = permissions;

    // Check if location services and background are needed on this device
    if (locationServicesNeeded === null || backgroundLocationNeeded === null) {
      const apiLevel = await DeviceInfo.getApiLevel();
      locationServicesNeeded = Platform.OS === 'android';
      backgroundLocationNeeded = locationServicesNeeded && apiLevel >= 29;

      //Update requirements to avoid the check the next time
      let updatedPermissions = {};
      if (locationServicesNeeded === false) {
        updatedPermissions.locationServices = 'N/A';
      }
      if (backgroundLocationNeeded === false) {
        updatedPermissions.backgroundLocation = 'N/A';
      }
      setPermissions({
        locationServicesNeeded,
        backgroundLocationNeeded,
        ...updatedPermissions,
      });
    }

    Roam.checkLocationPermission(location => {
      setPermissions({location});
    });
    if (locationServicesNeeded) {
      Roam.checkLocationServices(locationServices => {
        setPermissions({locationServices});
      });
    }
    if (backgroundLocationNeeded) {
      Roam.checkBackgroundLocationPermission(backgroundLocation => {
        setPermissions({backgroundLocation});
      });
    }
  }, [permissions]);

  //Request Permission
  const onRequestPermission = type => {
    switch (type) {
      case 'location':
        Roam.requestLocationPermission();
        break;
      case 'locationServices':
        Roam.requestLocationServices();
        break;
      case 'backgroundLocation':
        Roam.requestBackgroundLocationPermission();
        break;
    }
  };

  //Create User
  const onCreateUserPress = () => {
    roam.createTestUser().then((response) => setUserId(response.userId));
  };

  //Load User
  const onLoadTestUser = () => {
    roam
      .loadTestUser(userId)
      .then(response => {
        setLoadedUserId(response.userId)
        console.log(response.userId)
      })
      .catch(error => {
        if (error.errorCode === roam.ErrorCodes.InvalidUserId) {
          Alert.alert('Invalid user id', 'Please create a test user before');
        }
      });
  };


  //Set Tracking Config
  const setTrackingConfig = (accuracy, timeout, discardLocation, source) => {
      roam.setTrackingConfig(accuracy, timeout, Platform.OS === 'android' ? source : null, discardLocation)
      .then(success => {
        console.log(JSON.stringify(success))
        setTrackingConfigResponse(JSON.stringify(success))
      })
      .catch(error => {
        console.log(JSON.stringify(error))
        setTrackingConfigResponse(JSON.stringify(error))
      })
  }

  const getTrackingConfig = () => {
    roam.getTrackingConfig()
    .then(success => {
      console.log(JSON.stringify(success))
      setTrackingConfigResponse(JSON.stringify(success))
    })
    .catch(error => {
      console.log(JSON.stringify(error))
      setTrackingConfigResponse(JSON.stringify(error))
    })
  }

  const resetTrackingConfig = () => {
    roam.resetTrackingConfig()
    .then(success => {
      console.log(JSON.stringify(success))
      setTrackingConfigResponse(JSON.stringify(success))
    })
    .catch(error => {
      console.log(JSON.stringify(error))
      setTrackingConfigResponse(JSON.stringify(error))
    })
  }



  //Trip Summary
  const onGetTripSummaryPress = () => {
    const handleGetTripSummaryCallback = async success => {
      console.log(JSON.stringify(success))
      setTripSummaryResponse(JSON.stringify(success))
      setTripSummaryStatus('SUCCESS');
      setDistanceCovered(success.distanceCovered);
      setDuration(success.duration);
      setElevationGain(success.elevationGain);
      setRouteCount(success.route.length);
    };
    const handleGetTripSummaryError = error => {
      setTripSummaryStatus('ERROR');
      setTripSummaryResponse(JSON.stringify(error))
    };
    Roam.getTripSummary(
      tripId,
      handleGetTripSummaryCallback,
      handleGetTripSummaryError,
    );
  };

  const onCreateTripPress = () => {
    //startTracking()
    console.log('create trip press')
    setTimeout(() => {
      Roam.createTrip(true, success => {
        console.log(JSON.stringify(success))
        onSubscribeTrip(success.id)
        onListenTripUpdates()
        startTrip(success.id)
        AsyncStorage.setItem('tripId', success.id);
        setTripId(success.id)
        setTripResponse(JSON.stringify(success))
      }, error => {
        console.log(JSON.stringify(error))
        setTripResponse(JSON.stringify(error))
      });
    }, 50000)
      
  };

  //14:46:23
  //14:47:13

  

  const exportToStorage = () => {
    const { fs } = RNFetchBlob
    const DownloadDir = Platform.OS === 'ios' ? fs.dirs['MainBundleDir'] : fs.dirs['SDCardApplicationDir']
    const filename = `${tripId}.txt`
    const pathToWrite = `${DownloadDir}/${filename}`
    RNFetchBlob.fs
    .writeFile(pathToWrite, tripSummaryResponse, 'utf8')
    .then(() => {
      setTripListener('Trip Summary Exported')
      console.log('Exported')
    }).catch( e => {
      console.log(e)
    })
  }

  
  

  const startTracking = () => {
    if(Platform.OS === 'android'){
      Roam.setForegroundNotification(
        true,
        "Roam Example",
        "Tap to open",
        "mipmap/ic_launcher",
        "com.ayumitra.development.MainActivity",
        "com.ayumitra.development.RoamForegroundService"
      )
    }
    Roam.publishAndSave(null);
    
        Roam.offlineLocationTracking(true)
        switch(trackingMode){

          case 'ACTIVE':
            Roam.startTracking(Roam.TrackingMode.ACTIVE)
            break;

            case 'BALANCED':
              Roam.startTracking(Roam.TrackingMode.BALANCED)
            break;

            case 'PASSIVE':
              Roam.startTracking(Roam.TrackingMode.PASSIVE)
            break;

            case 'TIME':
              if(Platform.OS === 'ios'){
                Roam.startTrackingCustom(
                  true,
                  false,
                  Roam.ActivityType.FITNESS,
                  Roam.DesiredAccuracyIOS.BEST,
                  true,
                  0,
                  parseInt(accuracyFilter),
                  parseInt(timeInterval)
                )
              } else {
                Roam.startTrackingTimeInterval(parseInt(timeInterval), Roam.DesiredAccuracy.HIGH)
              }
            break;

            case 'DISTANCE':
              if(Platform.OS === 'ios'){
                Roam.startTrackingCustom(
                  true,
                  false,
                  Roam.ActivityType.FITNESS,
                  Roam.DesiredAccuracyIOS.BEST,
                  true,
                  parseInt(distanceInterval),
                  parseInt(accuracyFilter),
                  0
                )
              } else {
                Roam.startTrackingDistanceInterval(parseInt(distanceInterval), parseInt(stopDuration), Roam.DesiredAccuracy.HIGH)
              }
            break;

        }
        

  }

  const updateStationaryInterval = () => {
    console.log(`stationary interval: ${stationaryInterval}`)
    Roam.updateLocationWhenStationary(parseInt(stationaryInterval))
  }

  const stopTracking = () => {
    if(Platform.OS === 'android'){
      Roam.setForegroundNotification(
        false,
        "Roam Example",
        "Tap to open",
        "mipmap/ic_launcher",
        "com.ayumitra.development.MainActivity",
        "com.ayumitra.development.RoamForegroundService"
      )
    }
    Roam.stopPublishing();
        Roam.stopTracking();
  }

  const startTrip = (tripID) => {
    //setTimeout(() => {
      //startTracking()
      Roam.startTrip(tripID, 'test-trip', success => {
        console.log(JSON.stringify(success))
        setTripResponse(JSON.stringify(success))
      }, error => {
        console.log(JSON.stringify(error))
        setTripResponse(JSON.stringify(error))
      })
    //}, 90000)
  }

  const stopTrip = () => {
    Roam.stopTrip(tripId, success => {
      console.log(JSON.stringify(success))
      setTripResponse(JSON.stringify(success))
    }, error => {
      console.log(JSON.stringify(error))
      setTripResponse(JSON.stringify(error))
    })
  }

  const syncTrip = () => {
    Roam.syncTrip(tripId, success => {
      console.log(JSON.stringify(success))
      setTripResponse(JSON.stringify(success))
    }, error => {
      console.log(JSON.stringify(error))
      setTripResponse(JSON.stringify(error))
    })
  }

  const onToggleTrip = () => {
    if (typeof tripId === 'undefined') {
      Alert.alert('Invalid trip id', 'Please create a test trip before');
      return;
    }
   // if (tripTrackingStatus === 'STARTED') {
      // Alert.alert('Trip already started', 'Please create a test trip before');

      // return;
   // }
    console.log('Toggle trip');
    roam
      .toggleTrip(tripId, (tripTrackingStatus === 'STARTED'))
      .then(setTripTrackingStatus)
      .catch(error => {
        if (error === roam.ErrorCodes.InvalidUserId) {
          Alert.alert('Invalid trip id', 'Please create a test trip before');
        }
      });
  };

  const enableEvents = () => {
    // Just to make each flag explicit
    const Events = {
      geofenceEnabled: false,
      tripEnabled: true,
      locationEnabled: true,
      movingGeofenceEnabled: false,
    };

    Roam.toggleEvents(
      Events.geofenceEnabled,
      Events.tripEnabled,
      Events.locationEnabled,
      Events.movingGeofenceEnabled,
      ({locationEvents, tripsEvents}) => {
        const statusText =
          locationEvents && tripsEvents ? 'Enabled' : 'Disabled';
        setEventStatus(statusText);
      },
      () => {
        setEventStatus('Error');
      },
    );
  };

  const enableListeners = () => {
    // Just to make each flag explicit
    const Listeners = {
      locationListenerEnabled: true,
      eventListenerEnabled: true,
    };

    Roam.toggleListener(
      Listeners.locationListenerEnabled,
      Listeners.eventListenerEnabled,
      ({eventListenerStatus, locationListenerStatus}) => {
        const statusText =
          eventListenerStatus && locationListenerStatus
            ? 'Enabled'
            : 'Disabled';
        setListenerStatus(statusText);
      },
      () => {
        setListenerStatus('Error');
      },
    );
  };

  const onSubscribeLocation = () => {
    if (typeof loadedUserId === 'undefined') {
      Alert.alert('Invalid user id', 'Please load a test user before');
      return;
    }

    Roam.subscribe('LOCATION', loadedUserId);
    setSubscriptionStatus('Enabled');
  };
  const onSubscribeTrip = (tripID) => {
    // if (typeof tripID === 'undefined') {
    //   Alert.alert('Invalid trip id', 'Please create a test trip before');
    //   return;
    // }

    console.log(`tripID before subscribe: ${tripID}`)
    Roam.subscribeTripStatus(tripID);
    setTripSubscriptionStatus('Enabled');
  };

  const onListenUpdates = () => {
    if (subscriptionStatus !== 'Enabled') {
      Alert.alert('Error', 'Please, subscribe location before');
      return;
    }
    Roam.startListener('location', locations => {
      locations.map((location) => {
        console.log(JSON.stringify(location))
      })
      //console.log('Location', location);
      setUpdateCounter(count => count + locations.length);
      setCurrentLocation(JSON.stringify(locations))
    });
    setListenUpdatesStatus('Enabled');
  };

  

  

  


  const setBatchConfig = () => {
    Roam.setBatchReceiverConfig(networkState, parseInt(batchCount), parseInt(batchWindow), success => {
      console.log(JSON.stringify(success))
      setBatchResponse(JSON.stringify(success))
    }, error => {
      console.log(JSON.stringify(error))
      setBatchResponse(JSON.stringify(error))
    } )
  }

  const getBatchConfig = () => {
    Roam.getBatchReceiverConfig(success => {
      console.log(JSON.stringify(success))
      setBatchResponse(JSON.stringify(success))
    }, error => {
      console.log(JSON.stringify(error))
      setBatchResponse(JSON.stringify(error))
    })
  }

  const resetBatchConfig = () => {
    Roam.resetBatchReceiverConfig(success => {
      console.log(JSON.stringify(success))
      setBatchResponse(JSON.stringify(success))
    }, error => {
      console.log(JSON.stringify(error))
      setBatchResponse(JSON.stringify(error))
    })
  }


  

  const onListenTripUpdates = () => {
    // if (tripSubscriptionStatus !== 'Enabled') {
    //   Alert.alert('Error', 'Please, subscribe trip before');
    //   return;
    // }
    Roam.startListener('trip_status', tripLocation => {
      console.log('Trip Location', tripLocation);
      let METADATA = {'METADATA': {'tripId': tripLocation.tripId, 'distance': tripLocation.distance, 'duration': tripLocation.duration, 'tripState': 'ongoing'}}
      Roam.publishAndSave(METADATA)
      setTripListener(JSON.stringify(tripLocation))
      setTripUpdateCounter(count => count + 1);
    });
    setTripListenUpdatesStatus('Enabled');
  };

  const [currentLocation, setCurrentLocation] = useState('')

  const updateCurrentLocation = () => {
    Roam.startListener('location', locations => {
      console.log(JSON.stringify(locations))
      setCurrentLocation(JSON.stringify(locations))
    })
    if(Platform.OS === 'android'){
      Roam.updateCurrentLocation(Roam.DesiredAccuracy.HIGH, 50)
    } else {
      Roam.updateCurrentLocationIos(50)
    }
  }

  const getCurrentLocation = () => {
    if(Platform.OS === 'android'){
      Roam.getCurrentLocation(Roam.DesiredAccuracy.HIGH, 50, success => {
        console.log(JSON.stringify(success))
        setCurrentLocation(JSON.stringify(success))
      }, error => {
        console.log(JSON.stringify(error))
        setCurrentLocation(JSON.stringify(error))
      })
    } else {
      Roam.getCurrentLocationIos(50, success => {
        console.log(JSON.stringify(success))
        setCurrentLocation(JSON.stringify(success))
      }, error => {
        console.log(JSON.stringify(error))
        setCurrentLocation(JSON.stringify(error))
      })
    }
  }

  function onPressSourceRadioButton(radioButtonArray){
    setSourceRadioButtons(radioButtonArray)
    setSelectedSource(radioButtonArray.find(e => e.selected === true))
  }

  if (!initialized) {
    return <Loader />;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}>
          <View style={styles.sectionContainer}>
            <Text style={styles.title}>User</Text>
            <View style={styles.row}>
              <Button onPress={onCreateUserPress}>Create test user</Button>
              <TextField>{userId}</TextField>
            </View>
            <View style={styles.row}>
              <Button title="" onPress={onLoadTestUser}>
                Load test user
              </Button>
              <TextField>
                {typeof loadedUserId === 'undefined' ? 'Empty' : loadedUserId}
              </TextField>
            </View>
          </View>
          <View style={styles.sectionContainer}>
            <View style={[styles.row, styles.actionRow]}>
              <Text style={styles.title}>Permissions</Text>
              <Button type="action" onPress={onCheckPermissions}>
                Refresh
              </Button>
            </View>
            <Text style={styles.item}>Location Permission</Text>
            <View style={styles.row}>
              <Button onPress={() => onRequestPermission('location')}>
                Request
              </Button>
              <TextField>{permissions.location}</TextField>
            </View>
            <Text style={styles.item}>Location Services</Text>
            <View style={styles.row}>
              <Button
                disabled={!permissions.locationServicesNeeded}
                onPress={() => onRequestPermission('locationServices')}>
                Request
              </Button>
              <TextField>{permissions.locationServices}</TextField>
            </View>
            <Text style={styles.item}>Background location</Text>
            <View style={styles.row}>
              <Button
                disabled={!permissions.backgroundLocationNeeded}
                onPress={() => onRequestPermission('backgroundLocation')}>
                Request
              </Button>
              <TextField>{permissions.backgroundLocation}</TextField>
            </View>
          </View>
          <View style={styles.sectionContainer}>
          <Text style={styles.title}>Tracking Config</Text>
          <View style={styles.row}>
          <Text style={styles.sectionDescription}>Accuracy: </Text>
          <TextInput
          style={styles.input}
          placeholder="Accuracy"
          value={trackingAccuracy}
          onChangeText={(newValue) => setTrackingAccuracy(newValue)}
          />
          </View>
          <View style={styles.row}>
          <Text style={styles.sectionDescription}>Timeout: </Text>
          <TextInput
          style={styles.input}
          placeholder="Timeout"
          value={trackingTimeout}
          onChangeText={(value) => setTrackingTimeout(value)}
          />
          </View>
          {
            Platform.OS === 'android'
            ? <RadioGroup
            radioButtons={sourceRadioButtons}
            onPress={onPressSourceRadioButton}
            layout='row'
            />
            : <View/>
          }
          <View style={styles.row}>
          <CheckBox
          disabled={false}
          value={discardLocation}
          onValueChange={(newValue) => setDiscardLocation(newValue)}
          />
          <Text style={styles.sectionDescription}>Discard Location</Text>
          </View>
          <Button onPress={() => setTrackingConfig(trackingAccuracy, trackingTimeout, discardLocation, selectedSource.value)}>Set Tracking Config</Button>
          <Button onPress={() => getTrackingConfig()}>Get Tracking Config</Button>
          <Button onPress={() => resetTrackingConfig()}>Reset Tracking Config</Button>
          <Text style={styles.counter}>Response: {trackingConfigResponse}</Text>
          </View>

          <View style={styles.sectionContainer}>
          <Text style={styles.title}>Batch Config</Text>
          <Text style={styles.counter}>Batch Response: {batchResponse}</Text>
          <View style={styles.row}>
              <Text>Batch Count</Text>
              <TextInput 
              style={styles.input}
              value={batchCount}
              onChangeText={(value) => setBatchCount(value)}
              />
            </View>
            <View style={styles.row}>
              <Text>Batch Window</Text>
              <TextInput 
              style={styles.input}
              value={batchWindow}
              onChangeText={(value) => setBatchWindow(value)}
              />
            </View>
            <Text style={styles.title}>Network State: {networkState}</Text>
            <View style={styles.row}>
              <Button onPress={() => {
                setNetworkState(Roam.NetworkState.BOTH)
              }}>BOTH</Button>
              <Button onPress={() => {
                setNetworkState(Roam.NetworkState.ONLINE)
              }}>ONLINE</Button>
              <Button onPress={() => {
                setNetworkState('OFFLINE')
              }}>OFFLINE</Button>
            </View>
            <View style={styles.row}>
              <Button onPress={() => {
                setBatchConfig()
              }}>Set batch config</Button>
            </View>
            <View style={styles.row}>
            <Button onPress={() => {
                getBatchConfig()
              }}>Get batch config</Button>
            </View>
            <View style={styles.row}>
            <Button onPress={() => {
                resetBatchConfig()
              }}>Reset batch config</Button>
            </View>
            
              
          </View>

          <View style={styles.sectionContainer}>
          <Text style={styles.title}>Tracking Mode</Text>
          <Text style={styles.counter}>Current Tracking Mode: {trackingMode}</Text>
          <Button onPress={() => {setTrackingMode('ACTIVE')}}>ACTIVE</Button>
          <Button onPress={() => {setTrackingMode('BALANCED')}}>BALANCED</Button>
          <Button onPress={() => {setTrackingMode('PASSIVE')}}>PASSIVE</Button>
          <View style={styles.row}>
              <Button onPress={() => {
                setTrackingMode('TIME')
              }}>TIME</Button>
              <TextInput 
              style={styles.input}
              value={timeInterval}
              onChangeText={(value) => setTimeInterval(value)}
              />
            </View>
            <View style={styles.row}>
              <Button onPress={() => {setTrackingMode('DISTANCE')}}>DISTANCE</Button>
              <TextInput 
              style={styles.input}
              value={distanceInterval}
              onChangeText={(value) => setDistanceInterval(value)}
              />
            </View>
            <View style={styles.row}>
              <Text>Stop Duration (Android)</Text>
              <TextInput 
              style={styles.input}
              value={stopDuration}
              onChangeText={(value) => setStopDuration(value)}
              />
            </View>
            <View style={styles.row}>
              <Text>Accuracy (iOS)</Text>
              <TextInput 
              style={styles.input}
              value={accuracyFilter}
              onChangeText={(value) => setAccuracyFilter(value)}
              />
            </View>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.title}>Actions</Text>
            <View style={styles.row}>
              <Button onPress={enableEvents}>Enable Events</Button>
              <TextField>{eventStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={enableListeners}>Enable Listeners</Button>
              <TextField>{listenerStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={onSubscribeLocation}>Subscribe Location</Button>
              <TextField>{subscriptionStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={onListenUpdates}>Listen updates</Button>
              <TextField>{listenUpdatesStatus}</TextField>
            </View>
           
              <Button onPress={() => startTracking()}>Start Tracking</Button>
              <Button onPress={() => stopTracking()}>Stop Tracking</Button>
           
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Location updates: {updateCoutner}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
          <Text style={styles.title}>Stationary Interval</Text>
          <View style={styles.row}>
              <Button onPress={() => {
                updateStationaryInterval()
              }}>UPDATE</Button>
              <TextInput 
              style={styles.input}
              value={stationaryInterval}
              onChangeText={(value) => setStationaryInterval(value)}
              />
            </View>
          </View>
          <View style={styles.sectionContainer}>
          <Text style={styles.title}>Current Location</Text>
          <Button onPress={() => getCurrentLocation()}>Get currrent location</Button>
          <Button onPress={() => updateCurrentLocation()}>Update currrent location</Button>
          <Text style={styles.counter}>
              Location : {currentLocation}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.title}>Trips</Text>
            <Text style={styles.counter}>
              Trip Response : {tripResponse}
            </Text>
            <View style={styles.row}>
              <Button onPress={onCreateTripPress}>Create test trip</Button>
              <TextField>
                {typeof tripId === 'undefined' ? 'Empty' : tripId}
              </TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={onSubscribeTrip}>Subscribe Trip</Button>
              <TextField>{tripSubscriptionStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={onListenTripUpdates}>Listen trip</Button>
              <TextField>{listenUpdatesTripStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={startTrip}>Start Trip</Button>
            </View>
            <View style={styles.row}>
              <Button onPress={stopTrip}>Stop Trip</Button>
            </View>
            <View style={styles.row}>
              <Button onPress={syncTrip}>Sync Trip</Button>
            </View>
            <View style={styles.row}>
              <Button onPress={onGetTripSummaryPress}>Get trip summary</Button>
              <TextField>{tripSummaryStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={exportToStorage}>Export Trip Summary</Button>
            </View>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Trip updates: {tripUpdateCoutner}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Trip Listener: {tripListener}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Trip Summary
              {'\n'}Distance Covered: {distanceCovered}
              {'\n'}Duration: {duration}
              {'\n'}Elevation Gain: {elevationGain}
              {'\n'}Route Count: {routeCount}
              {'\n'}{'\n'}JSON Response: {tripSummaryResponse}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    backgroundColor: 'white',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
  },
  actionRow: {
    justifyContent: 'space-between',
  },
  sectionContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  item: {
    marginTop: 5,
    fontSize: 18,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  footer: {
    fontSize: 12,
    fontWeight: '600',
    padding: 4,
    paddingRight: 12,
    textAlign: 'right',
  },
  counter: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'red',
  },
  input: {
    alignSelf: 'center',
    textAlign: 'center',
    textAlignVertical: 'center',
    borderColor: 'gray',
    borderWidth: 1,
    fontSize: 18,
    padding: 5,
    margin: 10,
    flex: 1,
    fontWeight: 'bold',
    borderRadius: 5
  },
});

export default App;
