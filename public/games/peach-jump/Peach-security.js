window.GameSecurity = (function () {
  let _salt;
  let _score;
  let _maxHeight;
  let _lastUpdate;
  let _isCheater;

  function encrypt(val) {
    return Math.round(val * 7 + _salt) ^ 0xC0FFEE;
  }
  function decrypt(val) {
    return ((val ^ 0xC0FFEE) - _salt) / 7;
  }

  function reset() {
    _salt = Math.floor(Math.random() * 10000);
    console.log("[DEBUG SEC] _salt =", _salt);
    _score = encrypt(0);
    _maxHeight = encrypt(300);
    _lastUpdate = Date.now();
    _isCheater = false;
    // Test decrypt!
    console.log("[DEBUG SEC] encrypt(0) =", encrypt(0), "decrypt(0) =", decrypt(encrypt(0)));
    console.log("[DEBUG SEC] encrypt(300) =", encrypt(300), "decrypt(300) =", decrypt(encrypt(300)));
  }

  reset();

  return {
    setScore: v => { _score = encrypt(v); },
    getScore: () => Math.round(decrypt(_score)),
    setMaxHeight: v => { _maxHeight = encrypt(v); },
    getMaxHeight: () => decrypt(_maxHeight),
    frameCheck: function (deltaTime) {
      _lastUpdate = Date.now();
    },
    isCheater: () => _isCheater,
    flagCheat: () => { _isCheater = true; },
    reset: reset
  };
})();
