/**
 * @fileoverview Chooses the first route from onboarding, wallet existence, lock state, and pending work.
 * @module app/index
 */

import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}
