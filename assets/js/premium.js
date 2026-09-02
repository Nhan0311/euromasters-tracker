/* ==========================================================================
   EuroMasters — lớp kích hoạt Pro
   Thứ tự xác thực:
     1) Gumroad License API  (nguồn sự thật khi bán hàng thật)
     2) Key offline có checksum (dự phòng khi API bị chặn / phát key thủ công)
   Lưu ý: đây là kiểm tra phía trình duyệt, phù hợp cho sản phẩm thông tin.
   Muốn chống sao chép triệt để thì cần một proxy phía server (xem README).
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.EMT_CONFIG;
  var LS_KEY = "emt.license.v1";

  var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 ký tự, bỏ I O 0 1

  /* FNV-1a 32-bit — trùng khớp với tools/genkey.py */
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  function checksumOf(payload) {
    var h = fnv1a(payload + "|" + CFG.KEY_SALT);
    var out = "";
    for (var i = 0; i < 4; i++) {
      out += ALPHABET[(h >>> (i * 5)) & 31];
    }
    return out;
  }

  function normalize(key) {
    return String(key || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  /* Key offline: 16 ký tự = 12 payload + 4 checksum, hiển thị XXXX-XXXX-XXXX-XXXX */
  function verifyOffline(key) {
    if (!CFG.ALLOW_OFFLINE_KEYS) return false;
    var k = normalize(key);
    if (k.length !== 16) return false;
    for (var i = 0; i < 16; i++) if (ALPHABET.indexOf(k[i]) === -1) return false;
    return checksumOf(k.slice(0, 12)) === k.slice(12);
  }

  /* Gumroad License API */
  function verifyGumroad(key) {
    var body = new URLSearchParams();
    if (CFG.GUMROAD_PRODUCT_ID) body.set("product_id", CFG.GUMROAD_PRODUCT_ID);
    else body.set("product_permalink", CFG.GUMROAD_PERMALINK);
    body.set("license_key", String(key || "").trim());
    body.set("increment_uses_count", "false");

    return fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    })
      .then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) {
        if (!j) return { state: "unreachable" };
        if (j.success !== true) {
          var m = (j.message || "").toLowerCase();
          if (m.indexOf("product") !== -1 && m.indexOf("not") !== -1) return { state: "unreachable" };
          return { state: "invalid", message: j.message || "Key không hợp lệ." };
        }
        var p = j.purchase || {};
        if (p.refunded || p.chargebacked || p.disputed) {
          return { state: "invalid", message: "Đơn hàng này đã được hoàn tiền hoặc đang tranh chấp." };
        }
        if (p.subscription_cancelled_at || p.subscription_failed_at) {
          return { state: "invalid", message: "Gói đăng ký đã hết hiệu lực." };
        }
        if (CFG.MAX_USES > 0 && typeof j.uses === "number" && j.uses > CFG.MAX_USES) {
          return { state: "invalid", message: "Key đã kích hoạt trên quá " + CFG.MAX_USES + " thiết bị." };
        }
        return {
          state: "valid",
          source: "gumroad",
          email: p.email || "",
          product: p.product_name || "",
          uses: j.uses || 1
        };
      })
      .catch(function () { return { state: "unreachable" }; });
  }

  var Premium = {
    active: false,
    info: null,

    load: function () {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return false;
        var d = JSON.parse(raw);
        if (!d || !d.key) return false;
        // Key offline kiểm tra lại được ngay; key Gumroad tin vào bản lưu
        // (đã xác thực khi kích hoạt) để app vẫn chạy khi offline.
        if (d.source === "offline" && !verifyOffline(d.key)) { this.clear(); return false; }
        this.active = true;
        this.info = d;
        return true;
      } catch (e) { return false; }
    },

    save: function (key, res) {
      var d = {
        key: String(key).trim(),
        source: res.source || "offline",
        email: res.email || "",
        product: res.product || "",
        at: new Date().toISOString()
      };
      try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) {}
      this.active = true;
      this.info = d;
      return d;
    },

    clear: function () {
      try { localStorage.removeItem(LS_KEY); } catch (e) {}
      this.active = false;
      this.info = null;
    },

    /* -> Promise<{ok:boolean, message:string, source?:string}> */
    activate: function (key) {
      var self = this;
      var raw = String(key || "").trim();
      if (raw.length < 8) {
        return Promise.resolve({ ok: false, message: "Key quá ngắn — hãy dán đúng chuỗi trong email Gumroad." });
      }
      return verifyGumroad(raw).then(function (res) {
        if (res.state === "valid") {
          self.save(raw, res);
          return { ok: true, source: "gumroad", message: "Đã kích hoạt Pro" + (res.email ? " cho " + res.email : "") + ". Cảm ơn bạn!" };
        }
        if (res.state === "invalid") {
          // vẫn cho phép key offline hợp lệ (key VIP tự phát)
          if (verifyOffline(raw)) {
            self.save(raw, { source: "offline" });
            return { ok: true, source: "offline", message: "Đã kích hoạt Pro bằng key nội bộ." };
          }
          return { ok: false, message: res.message || "Key không hợp lệ." };
        }
        // unreachable
        if (verifyOffline(raw)) {
          self.save(raw, { source: "offline" });
          return { ok: true, source: "offline", message: "Đã kích hoạt Pro (chế độ ngoại tuyến)." };
        }
        return {
          ok: false,
          message: "Không kết nối được máy chủ Gumroad để xác thực. Kiểm tra mạng rồi thử lại, " +
                   "hoặc dùng key nội bộ dạng XXXX-XXXX-XXXX-XXXX."
        };
      });
    },

    /* Dùng để chặn tính năng: trả về true nếu được phép */
    gate: function (featureLabel) {
      if (this.active) return true;
      if (window.EMT && window.EMT.openPro) window.EMT.openPro(featureLabel);
      return false;
    }
  };

  Premium.load();
  window.EMT_PREMIUM = Premium;
  window.EMT_PREMIUM._verifyOffline = verifyOffline; // để test
})();
