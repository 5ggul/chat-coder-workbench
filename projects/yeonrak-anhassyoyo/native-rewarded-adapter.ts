/**
 * React Native production adapter contract for rewarded ads.
 * Intended package: react-native-google-mobile-ads
 * Inject this adapter as YEONRAK_NATIVE_ADS.showRewarded in the native shell.
 * Ad unit ids must come from runtime configuration; never commit production ids here.
 */
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

export async function showRewardedAd(adUnitId?: string): Promise<boolean> {
  const rewarded = RewardedAd.createForAdRequest(adUnitId || TestIds.REWARDED);

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubEarned();
      unsubError();
      unsubClosed();
      resolve(value);
    };

    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => rewarded.show());
    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => finish(true));
    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false));
    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(false));
    rewarded.load();
  });
}
