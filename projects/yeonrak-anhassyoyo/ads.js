(function () {
  const nativeBridge = window.YEONRAK_NATIVE_ADS;

  async function showRewarded(placement) {
    if (nativeBridge && typeof nativeBridge.showRewarded === 'function') {
      const result = await nativeBridge.showRewarded(placement);
      return Boolean(result && (result.rewarded === true || result === true));
    }

    // Browser/PWA development fallback. Production mobile builds inject
    // YEONRAK_NATIVE_ADS from the AdMob rewarded adapter.
    await new Promise(resolve => setTimeout(resolve, 850));
    return true;
  }

  window.YeonrakAds = { showRewarded };
})();
