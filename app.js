
(function () {
  "use strict";

  function get(id) {
    return document.getElementById(id);
  }

  function number(id) {
    var el = get(id);
    if (!el) return 0;
    var v = parseFloat(String(el.value || "").replace(",", "."));
    return isFinite(v) ? v : 0;
  }

  function euro(v) {
    if (!isFinite(v)) v = 0;
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(v);
  }

  function specials() {
    try {
      var raw = localStorage.getItem("meinGeldplanSonderausgaben");
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }

  function saveSpecials(a) {
    try { localStorage.setItem("meinGeldplanSonderausgaben", JSON.stringify(a)); } catch (e) {}
  }

  function renderSpecials() {
    var list = get("specialList");
    var totalEl = get("seTotal");
    if (!list || !totalEl) return;
    var a = specials().sort(function(x,y){ return String(y.date).localeCompare(String(x.date)); });
    var total = 0;
    list.innerHTML = "";

    if (!a.length) {
      var note = document.createElement("div");
      note.className = "note";
      note.textContent = "Noch keine Sonderausgaben eingetragen.";
      list.appendChild(note);
    } else {
      a.forEach(function (e) {
        total += Number(e.amount) || 0;
        var row = document.createElement("div");
        row.className = "row";

        var left = document.createElement("span");
        var b = document.createElement("b");
        b.textContent = euro(Number(e.amount) || 0);
        left.appendChild(b);

        var br = document.createElement("br");
        left.appendChild(br);

        var small = document.createElement("span");
        small.className = "note";
        small.textContent = (e.date || "") + " · " + (e.category || "Sonstiges") + (e.text ? " · " + e.text : "");
        left.appendChild(small);

        var btn = document.createElement("button");
        btn.textContent = "Löschen";
        btn.style.width = "auto";
        btn.style.padding = "8px 11px";
        btn.style.background = "#f1f1f3";
        btn.style.color = "#111";
        btn.style.fontSize = "13px";
        btn.addEventListener("click", function () {
          saveSpecials(specials().filter(function(x){ return x.id !== e.id; }));
          renderSpecials();
          calculate();
        });

        row.appendChild(left);
        row.appendChild(btn);
        list.appendChild(row);
      });
    }
    totalEl.textContent = euro(total);
  }

  function addSpecial() {
    var amount = number("seBetrag");
    if (amount <= 0) {
      alert("Bitte einen gültigen Betrag eingeben.");
      return;
    }
    var date = get("seDatum").value || new Date().toISOString().slice(0,10);
    var item = {
      id: Date.now(),
      amount: amount,
      date: date,
      category: get("seKat").value,
      text: get("seText").value.trim()
    };
    var a = specials();
    a.push(item);
    saveSpecials(a);
    get("seBetrag").value = "";
    get("seText").value = "";
    renderSpecials();
    calculate();
  }

  function calculate() {
    var netto = number("bNetto");
    var fix = number("bFix");
    var extraSave = number("bExtraSave");
    var days = Math.max(1, number("bDays"));
    var specialTotal = specials().reduce(function(s,e){ return s + (Number(e.amount) || 0); }, 0);

    var afterFix = netto - fix;
    var afterAll = afterFix - extraSave - specialTotal;
    var day = afterAll / days;
    var week = day * 7;

    if (get("bRest")) get("bRest").textContent = euro(afterFix);
    if (get("bRestSave")) get("bRestSave").textContent = euro(afterAll);
    if (get("bDay")) get("bDay").textContent = euro(day);
    if (get("bWeek")) get("bWeek").textContent = euro(week);
    if (get("bDiff")) {
      var diff = week - number("bTarget");
      get("bDiff").textContent = (diff >= 0 ? "+" : "") + euro(diff);
    }

    var konto = number("sKonto");
    var bar = number("sBar");
    var target = number("sTarget");
    var need = Math.max(0, target - bar);
    var withdraw = Math.min(konto, need);

    if (get("sBarOut")) get("sBarOut").textContent = euro(bar);
    if (get("sNeed")) get("sNeed").textContent = euro(need);
    if (get("sWithdraw")) get("sWithdraw").textContent = euro(withdraw);
    if (get("sAfter")) get("sAfter").textContent = euro(konto - withdraw);

    var brutto = number("lGrund") + number("lPflege") + number("lUni") + number("lWechsel") + number("lTaxZ");
    var lNetto = number("lNetto");
    var unpf = number("lUntaxZ");
    var pf = number("lPf");

    if (get("lBrutto")) get("lBrutto").textContent = euro(brutto);
    if (get("lNettoOut")) get("lNettoOut").textContent = euro(lNetto);
    if (get("lUnpfOut")) get("lUnpfOut").textContent = euro(unpf);
    if (get("lBeforePf")) get("lBeforePf").textContent = euro(lNetto + unpf);
    if (get("lPfOut")) get("lPfOut").textContent = euro(pf);
    if (get("lAuszahlung")) get("lAuszahlung").textContent = euro(lNetto + unpf - pf);

    var uStand = number("uStand");
    var rate = number("uOwn") + number("uSteffi") + number("uExtra");
    var months = number("uMonths");
    var goal = number("uGoal");
    var forecast = uStand + rate * months;

    if (get("uMonth")) get("uMonth").textContent = euro(rate);
    if (get("uForecast")) get("uForecast").textContent = euro(forecast);
    if (get("uMissing")) get("uMissing").textContent = euro(Math.max(0, goal - forecast));

    if (get("aForecast")) {
      get("aForecast").textContent = euro(number("aStand") + number("aRate") * number("aMonths"));
    }
  }

  function init() {
    document.querySelectorAll("input, select").forEach(function(el){
      el.addEventListener("input", calculate);
      el.addEventListener("change", calculate);
    });

    document.querySelectorAll(".tab").forEach(function(btn){
      btn.addEventListener("click", function(){
        document.querySelectorAll(".tab").forEach(function(x){ x.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".view").forEach(function(v){ v.classList.add("hidden"); });
        var target = get(btn.getAttribute("data-tab"));
        if (target) target.classList.remove("hidden");
      });
    });

    var addBtn = document.querySelector('button[onclick*="addSpecial"]');
    if (addBtn) {
      addBtn.removeAttribute("onclick");
      addBtn.addEventListener("click", addSpecial);
    }

    var reload = document.querySelector('button[onclick*="location.reload"]');
    if (reload) reload.removeAttribute("onclick");

    renderSpecials();
    calculate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
