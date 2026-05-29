document.addEventListener('DOMContentLoaded', () => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.error('SW error', err));
    }

    const form = document.getElementById('calculator-form');
    const copyBtn = document.getElementById('copy-btn');
    const closeBtn = document.getElementById('close-sheet');
    const overlay = document.getElementById('sheet-overlay');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateAndDisplay();
    });

    copyBtn.addEventListener('click', copyToClipboard);

    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Live clock in header
    function updateClock() {
        const el = document.getElementById('live-datetime');
        if (!el) return;
        const now = new Date();
        const thaiYear = now.getFullYear() + 543;
        const month = thaiMonths[now.getMonth()];
        const day = now.getDate();
        const h = String(now.getHours()).padStart(2,'0');
        const m = String(now.getMinutes()).padStart(2,'0');
        el.textContent = `🕐 ${day} ${month} ${thaiYear}  ${h}:${m} น.`;
    }
    updateClock();
    setInterval(updateClock, 30000);
});

// Thai month abbreviations
const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function getCurrentThaiDateTime() {
    const now = new Date();
    const thaiYear = now.getFullYear() + 543;
    const thaiMonth = thaiMonths[now.getMonth()];
    const day = now.getDate();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `ประจำวันที่ ${day} ${thaiMonth} ${thaiYear} เวลา ${hours}:${minutes} น.`;
}

function calculateRH(Tdry, Twet) {
    const P = 1013.25;
    const A = 0.0008; // Unventilated psychrometer constant
    const ew = 6.112 * Math.exp((17.502 * Twet) / (240.97 + Twet));
    const es = 6.112 * Math.exp((17.502 * Tdry) / (240.97 + Tdry));
    const e = ew - A * P * (Tdry - Twet);
    let rh = (e / es) * 100;
    if (rh > 100) rh = 100;
    if (rh < 0) rh = 0;
    return Math.round(rh);
}

function calculateHeatIndex(TdryC, rh) {
    // NOAA Rothfusz regression (same as กรมอุตุนิยมวิทยา)
    const T = TdryC * 9 / 5 + 32;
    let HI = 0.5 * (T + 61.0 + ((T - 68.0) * 1.2) + (rh * 0.094));

    if (HI >= 80) {
        HI = -42.379 + 2.04901523 * T + 10.14333127 * rh
            - 0.22475541 * T * rh - 0.00683783 * T * T
            - 0.05481717 * rh * rh + 0.00122874 * T * T * rh
            + 0.00085282 * T * rh * rh - 0.00000199 * T * T * rh * rh;
        if (rh < 13 && T >= 80 && T <= 112) {
            HI -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
        } else if (rh > 85 && T >= 80 && T <= 87) {
            HI += ((rh - 85) / 10) * ((87 - T) / 5);
        }
    }
    return Math.round((HI - 32) * 5 / 9);
}

function getFlagInfo(hi) {
    if (hi < 27) return {
        colorName: "ขาว", emoji: "⚪", cls: "white",
        advice: "แนะนำให้ ฝึก 50 นาที พัก 10 นาที ดื่มน้ำ 1 ลิตร/ชั่วโมง"
    };
    if (hi <= 32) return {
        colorName: "เขียว", emoji: "🟢", cls: "green",
        advice: "แนะนำให้ ฝึก 50 นาที พัก 10 นาที ดื่มน้ำ 1 ลิตร/ชั่วโมง"
    };
    if (hi <= 40) return {
        colorName: "เหลือง", emoji: "🟡", cls: "yellow",
        advice: "แนะนำให้ ฝึก 45 นาที พัก 15 นาที ดื่มน้ำ 1 ลิตร/ชั่วโมง"
    };
    if (hi <= 51) return {
        colorName: "แดง", emoji: "🔴", cls: "red",
        advice: "แนะนำให้ ฝึก 30 นาที พัก 30 นาที ดื่มน้ำ 1 ลิตร/ชั่วโมง"
    };
    return {
        colorName: "ดำ", emoji: "⚫", cls: "black",
        advice: "แนะนำให้ ฝึก 20 นาที พัก 40 นาที ดื่มน้ำ 1 ลิตร/ชั่วโมง"
    };
}

function calculateAndDisplay() {
    const unitName = document.getElementById('unit-name').value.trim();
    const dryTemp = parseFloat(document.getElementById('dry-temp').value);
    const wetTemp = parseFloat(document.getElementById('wet-temp').value);

    if (isNaN(dryTemp) || isNaN(wetTemp)) {
        alert("กรุณากรอกอุณหภูมิแห้งและอุณหภูมิเปียก");
        return;
    }
    if (wetTemp > dryTemp) {
        alert("อุณหภูมิเปียกต้องไม่สูงกว่าอุณหภูมิแห้ง");
        return;
    }

    const rh = calculateRH(dryTemp, wetTemp);
    const hi = calculateHeatIndex(dryTemp, rh);
    const flag = getFlagInfo(hi);

    // Update flag banner
    const banner = document.getElementById('flag-banner');
    banner.className = `flag-banner ${flag.cls}`;
    document.getElementById('flag-emoji').textContent = flag.emoji;
    document.getElementById('flag-name').textContent = flag.colorName;
    document.getElementById('hi-val').textContent = hi;

    // Stats
    document.getElementById('rh-val').textContent = rh;
    document.getElementById('dry-display').textContent = `${dryTemp}°C`;
    document.getElementById('wet-display').textContent = `${wetTemp}°C`;

    // Advice
    document.getElementById('advice-text').textContent = flag.advice;

    // Compose report text
    const dateStr = getCurrentThaiDateTime();
    const unitLine = unitName ? `หน่วยฝึกทหารใหม่\n${unitName}` : 'หน่วยฝึกทหารใหม่';
    const outputText =
        `${unitLine}
อุณหภูมิสิ่งแวดล้อม/ดัชนีความร้อน
${dateStr}

อุณหภูมิแห้ง    ${dryTemp}
อุณหภูมิเปียก   ${wetTemp}
ความชื้นสัมพัทธ์  ${rh}
ดัชนีความร้อน   ${hi}

สัญลักษณ์ ธงสี ${flag.colorName} ${flag.emoji}
${flag.advice}`;

    document.getElementById('copy-text').value = outputText;

    // Show sheet
    const overlay = document.getElementById('sheet-overlay');
    overlay.classList.remove('hidden');
}

function copyToClipboard() {
    const text = document.getElementById('copy-text').value;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(showToast).catch(() => fallbackCopy());
    } else {
        fallbackCopy();
    }
}

function fallbackCopy() {
    const el = document.getElementById('copy-text');
    el.select();
    el.setSelectionRange(0, 99999);
    document.execCommand('copy');
    showToast();
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}
