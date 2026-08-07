import "react-native-get-random-values";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "ERROR: Error handling message with type https://didcomm.org/didexchange/1.1/response",
  "ERROR: Error handling message with type https://didcomm.org/present-proof/2.0/ack",
  "ERROR: Failed to process message",
]);

import "expo-router/entry";
