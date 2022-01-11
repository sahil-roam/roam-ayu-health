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
} from 'react-native';

import Roam from 'roam-reactnative';
import {Button, TextField, Loader} from './components';
import {roam} from './services';

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
      Roam.isLocationTracking(setTrackingStatus);
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

  // Actions
  const onCreateUserPress = () => {
    roam.createTestUser().then(setUserId);
  };

  const onGetTripSummaryPress = () => {
    const handleGetTripSummaryCallback = async success => {
      setTripSummaryStatus('SUCCESS');
      setDistanceCovered(success.distanceCovered);
      setDuration(success.duration);
      setElevationGain(success.elevationGain);
      setRouteCount(success.route.length);
    };

    const handleGetTripSummaryError = error => {
      setTripSummaryStatus('ERROR');
    };
    Roam.getTripSummary(
      tripId,
      handleGetTripSummaryCallback,
      handleGetTripSummaryError,
    );
  };

  const onCreateTripPress = () => {
    roam.createTestTrip().then(setTripId);
  };

  const onLoadTestUser = () => {
    roam
      .loadTestUser(userId)
      .then(setLoadedUserId)
      .catch(error => {
        if (error === roam.ErrorCodes.InvalidUserId) {
          Alert.alert('Invalid user id', 'Please create a test user before');
        }
      });
  };

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

  const onToggleTracking = () => {
    Roam.isLocationTracking(status => {
      if (status === 'GRANTED') {
        Roam.stopPublishing();
        Roam.stopTracking();
        setTrackingStatus('DENIED');
      } else {
        Roam.publishAndSave(null);
        if (Platform.OS === 'android') {
          Roam.startTrackingTimeInterval(2, 'HIGH');
        } else {
          Roam.startTrackingCustom(
            true,
            true,
            Roam.ActivityType.FITNESS,
            Roam.DesiredAccuracyIOS.BEST,
            true,
            10,
            10,
            10,
          );
        }
        setTrackingStatus('GRANTED');
      }
    });
  };

  const onToggleTrip = () => {
    if (typeof tripId === 'undefined') {
      Alert.alert('Invalid trip id', 'Please create a test trip before');
      return;
    }
    if (tripTrackingStatus === 'STARTED') {
      Alert.alert('Trip already started', 'Please create a test trip before');
      return;
    }
    console.log('Trip Started');
    roam
      .toggleTrip(tripId)
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
  const onSubscribeTrip = () => {
    if (typeof tripId === 'undefined') {
      Alert.alert('Invalid trip id', 'Please create a test trip before');
      return;
    }

    Roam.subscribeTripStatus(tripId);
    setTripSubscriptionStatus('Enabled');
  };

  const onListenUpdates = () => {
    if (subscriptionStatus !== 'Enabled') {
      Alert.alert('Error', 'Please, subscribe location before');
      return;
    }
    Roam.startListener('location', location => {
      console.log('Location', location);
      setUpdateCounter(count => count + 1);
    });
    setListenUpdatesStatus('Enabled');
  };

  const onListenTripUpdates = () => {
    if (subscriptionStatus !== 'Enabled') {
      Alert.alert('Error', 'Please, subscribe trip before');
      return;
    }
    Roam.startListener('trip_status', tripLocation => {
      console.log('Location', tripLocation);
      setTripUpdateCounter(count => count + 1);
    });
    setTripListenUpdatesStatus('Enabled');
  };

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
            <View style={styles.row}>
              <Button onPress={onToggleTracking}>Toggle Tracking</Button>
              <TextField>{trackingStatus}</TextField>
            </View>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Location updates: {updateCoutner}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.title}>Trips</Text>
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
              <Button onPress={onToggleTrip}>Toggle Trip</Button>
              <TextField>{tripTrackingStatus}</TextField>
            </View>
            <View style={styles.row}>
              <Button onPress={onGetTripSummaryPress}>Get trip summary</Button>
              <TextField>{tripSummaryStatus}</TextField>
            </View>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Trip updates: {tripUpdateCoutner}
            </Text>
          </View>
          <View style={styles.sectionContainer}>
            <Text style={styles.counter}>
              Trip Summary
              {'\n'}Distance Covered: {distanceCovered}
              {'\n'}Duration: {duration}
              {'\n'}Elevation Gain: {elevationGain}
              {'\n'}Route Count: {routeCount}
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
});

export default App;
