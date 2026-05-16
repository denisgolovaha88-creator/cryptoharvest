/**
 * CryptoHarvest Telegram Bot v4.0
 * 
 * УСТАНОВКА:
 * 1. npm install node-telegram-bot-api node-fetch
 * 2. Укажите ваши данные в разделе КОНФИГУРАЦИЯ ниже
 * 3. node bot.js
 * 
 * ИЛИ задеплойте на Railway.app / Render.com (бесплатно)
 */

const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

// ============================================================
// КОНФИГУРАЦИЯ — ЗАПОЛНИТЕ СВОИ ДАННЫЕ
// ============================================================
const CONFIG = {
    BOT_TOKEN:    '8963329314:AAG_140pS0q373IQq7YWV7L2QTTkhaZrawY',   // Токен от @BotFather
    CHAT_ID:      '7882247486',               // Ваш ID от @userinfobot
    FP_API_KEY:   '9062750ff8ff6e0bf8fc4a15bda63472f7fe741ad41ba4aa3251d02746ec0509',     // API ключ FaucetPay
    FP_ADDRESS:   '13jYCe3o9mJ3p6nYAQGuVpw4inRQ3LhEyY',        // Ваш BTC адрес на FaucetPay
    CHECK_INTERVAL: 5 * 60 * 1000,             // Проверка готовых кранов (5 мин)
};

// Курсы монет (обновляются автоматически)
let PRICES = { BTC: 45000, ETH: 2500, LTC: 150, SOL: 180 };

// Данные кранов (синхронизируются с приложением)
let faucets = [
    // BTC
    { id:1,  name:'FreeBitco.in',    url:'https://freebitco.in',    crypto:'BTC', interval:60,  enabled:true,  last:null, bal:0 },
    { id:2,  name:'Moon Bitcoin',    url:'https://moonbitcoin.io',  crypto:'BTC', interval:5,   enabled:true,  last:null, bal:0 },
    { id:3,  name:'Cointiply',       url:'https://cointiply.com',   crypto:'BTC', interval:60,  enabled:true,  last:null, bal:0 },
    { id:4,  name:'FireFaucet BTC',  url:'https://firefaucet.win',  crypto:'BTC', interval:60,  enabled:true,  last:null, bal:0 },
    { id:5,  name:'Rollercoin',      url:'https://rollercoin.com',  crypto:'BTC', interval:1440,enabled:true,  last:null, bal:0 },
    // ETH
    { id:6,  name:'FireFaucet ETH',  url:'https://firefaucet.win',  crypto:'ETH', interval:60,  enabled:true,  last:null, bal:0 },
    { id:7,  name:'AllCoins ETH',    url:'https://allcoins.pw',     crypto:'ETH', interval:60,  enabled:true,  last:null, bal:0 },
    { id:8,  name:'Free-Ethereum',   url:'https://free-ethereum.io',crypto:'ETH', interval:60,  enabled:true,  last:null, bal:0 },
    { id:9,  name:'Ether Faucet',    url:'https://etherfaucet.xyz', crypto:'ETH', interval:240, enabled:true,  last:null, bal:0 },
    { id:10, name:'Moon Ethereum',   url:'https://moonethereum.io', crypto:'ETH', interval:5,   enabled:false, last:null, bal:0 },
    // LTC
    { id:11, name:'Moon Litecoin',   url:'https://moonlitecoin.com',crypto:'LTC', interval:5,   enabled:true,  last:null, bal:0 },
    { id:12, name:'Free-Litecoin',   url:'https://free-litecoin.com',crypto:'LTC',interval:60,  enabled:true,  last:null, bal:0 },
    { id:13, name:'FireFaucet LTC',  url:'https://firefaucet.win',  crypto:'LTC', interval:60,  enabled:true,  last:null, bal:0 },
    { id:14, name:'Litecoin-Faucet', url:'https://litecoin-faucet.net',crypto:'LTC',interval:120,enabled:true, last:null, bal:0 },
    { id:15, name:'AllCoins LTC',    url:'https://allcoins.pw',     crypto:'LTC', interval:60,  enabled:true,  last:null, bal:0 },
    // SOL
    { id:16, name:'Sol-Faucet',      url:'https://sol-faucet.com',  crypto:'SOL', interval:60,  enabled:true,  last:null, bal:0 },
    { id:17, name:'FireFaucet SOL',  url:'https://firefaucet.win',  crypto:'SOL', interval:60,  enabled:true,  last:null, bal:0 },
    { id:18, name:'AllCoins SOL',    url:'https://allcoins.pw',     crypto:'SOL', interval:60,  enabled:true,  last:null, bal:0 },
    { id:19, name:'SolFaucet.io',    url:'https://solfaucet.io',    crypto:'SOL', interval:60,  enabled:true,  last:null, bal:0 },
    { id:20, name:'Stakely SOL',     url:'https://stakely.io/faucet/solana-sol',crypto:'SOL',interval:1440,enabled:true,last:null,bal:0 },
];

let earnings = { BTC:0, ETH:0, LTC:0, SOL:0 };
let autoCollect = false;
let autoTimer = null;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ БОТА
// ============================================================
const bot = new TelegramBot(CONFIG.BOT_TOKEN, { polling: true });
console.log('🤖 CryptoHarvest Bot запущен!');

// ============================================================
// ГЛАВНОЕ МЕНЮ — кнопки
// ============================================================
const MAIN_KEYBOARD = {
    keyboard: [
        ['💰 Мои кошельки',   '📊 Статус'],
        ['🚰 Найти краны',    '⚙️ Автосбор'],
        ['💳 FaucetPay',      '📈 Балансы'],
        ['⏰ Таймеры',        '🔍 Поиск монет'],
        ['💼 Консолидация',   'ℹ️ Справка'],
    ],
    resize_keyboard: true,
    persistent: true,
};

// ============================================================
// КОМАНДЫ БОТА
// ============================================================

// /start — главное меню
bot.onText(/\/start/, (msg) => {
    const name = msg.from.first_name || 'Пользователь';
    bot.sendMessage(msg.chat.id,
        `⚡ *CryptoHarvest v4.0*\n\nПривет, *${name}*! 👋\n\nКоманды:\n/status — статус кранов\n/balance — мои балансы\n/ready — готовые краны\n/fp — FaucetPay\n/find — поиск монет\n/auto — автосбор\n\n_Кнопки меню появятся ниже_ 👇`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    ['💰 Мои кошельки', '📊 Статус'],
                    ['🚰 Найти краны',  '⚙️ Автосбор'],
                    ['💳 FaucetPay',    '📈 Балансы'],
                    ['⏰ Таймеры',      '🔍 Поиск монет'],
                    ['💼 Консолидация', 'ℹ️ Справка'],
                ],
                resize_keyboard: true,
                persistent: true,
            }
        }
    );
});

// ============================================================
// КНОПКИ МЕНЮ
// ============================================================
bot.on('message', (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;
    if (!text) return;

    // Команды
    if (text === '/start' || text.startsWith('/start')) {
        const name = msg.from.first_name || 'Пользователь';
        bot.sendMessage(chatId,
            `⚡ *CryptoHarvest v4.0*\n\nПривет, *${name}*! 👋\nКнопки меню появились внизу 👇`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        ['💰 Мои кошельки', '📊 Статус'],
                        ['🚰 Найти краны',  '⚙️ Автосбор'],
                        ['💳 FaucetPay',    '📈 Балансы'],
                        ['⏰ Таймеры',      '🔍 Поиск монет'],
                        ['💼 Консолидация', 'ℹ️ Справка'],
                    ],
                    resize_keyboard: true,
                    persistent: true,
                }
            }
        );
        return;
    }
    if (text === '/help') { sendHelp(chatId); return; }
    if (text === '/status') { sendStatus(chatId); return; }
    if (text === '/balance') { sendBalances(chatId); return; }
    if (text === '/faucets') { sendFaucetsList(chatId); return; }
    if (text === '/ready') { sendReadyFaucets(chatId); return; }
    if (text === '/fp') { sendFaucetPayBalance(chatId); return; }
    if (text === '/auto') { toggleAutoCollect(chatId); return; }
    if (text === '/find') { findLostCoins(chatId); return; }
    if (text === '/consolidate') { consolidateReport(chatId); return; }

    // Кнопки меню
    if (text === '📊 Статус')         sendStatus(chatId);
    else if (text === '💰 Мои кошельки')  sendWallets(chatId);
    else if (text === '🚰 Найти краны')   sendFaucetsList(chatId);
    else if (text === '⚙️ Автосбор')      sendAutoMenu(chatId);
    else if (text === '💳 FaucetPay')     sendFaucetPayBalance(chatId);
    else if (text === '📈 Балансы')       sendBalances(chatId);
    else if (text === '⏰ Таймеры')       sendTimers(chatId);
    else if (text === '🔍 Поиск монет')   findLostCoins(chatId);
    else if (text === '💼 Консолидация')  consolidateReport(chatId);
    else if (text === '🤖 TG Боты')        sendTGBotsList(chatId, 'ALL');
    else if (text === '💎 Airdrops')    sendAirdrops(chatId);
    else if (text === '💸 Незабранные')    sendUnclaimedGuide(chatId);
    else if (text === 'ℹ️ Справка')       sendHelp(chatId);
});

// ============================================================
// INLINE КНОПКИ
// ============================================================
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'status')          sendStatus(chatId);
    else if (data === 'balances')   sendBalances(chatId);
    else if (data === 'ready')      sendReadyFaucets(chatId);
    else if (data === 'fp_balance') sendFaucetPayBalance(chatId);
    else if (data === 'timers')          sendTimers(chatId);
    else if (data === 'find_coins')      findLostCoins(chatId);
    else if (data === 'consolidate')     consolidateReport(chatId);
    else if (data.startsWith('chkaddr_')) {
        const addr = data.replace('chkaddr_', '');
        checkAddress(chatId, addr);
    }
    else if (data.startsWith('enable_')) {
        const id = parseInt(data.split('_')[1]);
        toggleFaucet(id, chatId);
    } else if (data === 'auto_on') {
        autoCollect = true;
        startAutoCollect(chatId);
        bot.answerCallbackQuery(query.id, { text: '✅ Автосбор включен!' });
    } else if (data === 'auto_off') {
        autoCollect = false;
        if (autoTimer) clearInterval(autoTimer);
        bot.sendMessage(chatId, '⏹ *Автосбор остановлен*', { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
        bot.answerCallbackQuery(query.id, { text: '⏹ Остановлен' });
    } else if (data.startsWith('visit_')) {
        const id = parseInt(data.split('_')[1]);
        markVisited(id, chatId);
        bot.answerCallbackQuery(query.id, { text: '✅ Посещение отмечено!' });
    }

    bot.answerCallbackQuery(query.id).catch(() => {});
});

// ============================================================
// ФУНКЦИИ ОТПРАВКИ СООБЩЕНИЙ
// ============================================================

function sendHelp(chatId) {
    const text = `🔧 *КОМАНДЫ БОТА*\n\n*Основные:*\n/start → Главное меню\n/help → Эта справка\n/status → Статус сборов\n/balance → Все балансы\n/faucets → Список кранов\n/ready → Готовые к сбору\n/fp → Баланс FaucetPay\n/auto → Вкл/выкл автосбор
/find → Поиск остатков монет
/consolidate → Отчёт консолидации
/checkaddr [адрес] → Проверить адрес
/search BTC → Найти BTC краны
/tgbots → Telegram боты-краны
/tgauto → Автосбор TG ботов
/airdrops → Активные airdrop'ы
/unclaimed → Незабранные награды\n\n*Кнопки меню:*\n💰 Мои кошельки → Ваши адреса\n📊 Статус → Статистика\n🚰 Найти краны → Список кранов\n⚙️ Автосбор → Управление\n💳 FaucetPay → Баланс FP\n📈 Балансы → Доходы\n⏰ Таймеры → Когда следующий\nℹ️ Справка → Эта страница\n\n_CryptoHarvest v4.0 • BTC+ETH+LTC+SOL_`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
}

function sendStatus(chatId) {
    const active = faucets.filter(f => f.enabled).length;
    const ready  = faucets.filter(f => f.enabled && isReady(f)).length;
    const total  = faucets.length;
    const btcTotal = earnings.BTC * PRICES.BTC;
    const ethTotal = earnings.ETH * PRICES.ETH;
    const ltcTotal = earnings.LTC * PRICES.LTC;
    const solTotal = earnings.SOL * PRICES.SOL;
    const allTotal = btcTotal + ethTotal + ltcTotal + solTotal;

    const text = `📊 *СТАТУС CRYPTOHARVEST*\n\n🚰 *Краны:*\n• Всего: ${total}\n• Активных: ${active}\n• Готовы к сбору: ${ready}\n\n💰 *Доходы:*\n₿ BTC: ${earnings.BTC.toFixed(6)} (~$${btcTotal.toFixed(2)})\nΞ ETH: ${earnings.ETH.toFixed(6)} (~$${ethTotal.toFixed(2)})\nŁ LTC: ${earnings.LTC.toFixed(6)} (~$${ltcTotal.toFixed(2)})\n◎ SOL: ${earnings.SOL.toFixed(6)} (~$${solTotal.toFixed(2)})\n\n💵 *Итого: ~$${allTotal.toFixed(2)} / ≈${(allTotal*100).toFixed(0)} ₽*\n\n🤖 Автосбор: ${autoCollect ? '🟢 Работает' : '🔴 Остановлен'}\n\n📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚰 Готовые краны', callback_data: 'ready' }],
                [{ text: '💳 FaucetPay баланс', callback_data: 'fp_balance' }],
                [{ text: '⏰ Таймеры', callback_data: 'timers' }],
            ]
        }
    });
}

function sendBalances(chatId) {
    const btcUSD = (earnings.BTC * PRICES.BTC).toFixed(2);
    const ethUSD = (earnings.ETH * PRICES.ETH).toFixed(2);
    const ltcUSD = (earnings.LTC * PRICES.LTC).toFixed(2);
    const solUSD = (earnings.SOL * PRICES.SOL).toFixed(2);
    const total  = (earnings.BTC*PRICES.BTC + earnings.ETH*PRICES.ETH + earnings.LTC*PRICES.LTC + earnings.SOL*PRICES.SOL).toFixed(2);
    const rub    = (parseFloat(total) * 100).toFixed(0);

    const text = `📈 *МОИ БАЛАНСЫ*\n\n₿ *BTC:* ${earnings.BTC.toFixed(8)}\n   ≈ $${btcUSD} / ≈${(btcUSD*100).toFixed(0)} ₽\n\nΞ *ETH:* ${earnings.ETH.toFixed(8)}\n   ≈ $${ethUSD} / ≈${(ethUSD*100).toFixed(0)} ₽\n\nŁ *LTC:* ${earnings.LTC.toFixed(8)}\n   ≈ $${ltcUSD} / ≈${(ltcUSD*100).toFixed(0)} ₽\n\n◎ *SOL:* ${earnings.SOL.toFixed(8)}\n   ≈ $${solUSD} / ≈${(solUSD*100).toFixed(0)} ₽\n\n━━━━━━━━━━━━━\n💵 *ИТОГО: ~$${total}*\n💴 *≈ ${rub} ₽*`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
            ]
        }
    });
}

function sendFaucetsList(chatId) {
    const groups = { BTC: [], ETH: [], LTC: [], SOL: [] };
    faucets.forEach(f => groups[f.crypto]?.push(f));

    let text = '🚰 *СПИСОК КРАНОВ*\n\n';
    for (const [cr, list] of Object.entries(groups)) {
        const ready = list.filter(f => f.enabled && isReady(f)).length;
        text += `*${cr}* (${list.filter(f=>f.enabled).length} акт. / ${ready} готовы):\n`;
        list.slice(0, 5).forEach(f => {
            const status = !f.enabled ? '⏸' : isReady(f) ? '✅' : '⏳';
            text += `  ${status} ${f.name} [${f.interval < 60 ? f.interval+'м' : Math.round(f.interval/60)+'ч'}]\n`;
        });
        text += '\n';
    }

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Только готовые', callback_data: 'ready' }],
                [{ text: '⏰ Таймеры', callback_data: 'timers' }],
            ]
        }
    });
}

function sendReadyFaucets(chatId) {
    const ready = faucets.filter(f => f.enabled && isReady(f));

    if (!ready.length) {
        const nextF = faucets.filter(f=>f.enabled && !isReady(f)).sort((a,b) => getSecsLeft(a)-getSecsLeft(b))[0];
        const nextTime = nextF ? `\n\n⏰ Следующий: *${nextF.name}* через ${getTimeLeft(nextF)}` : '';
        return bot.sendMessage(chatId, `💤 *Нет готовых кранов*${nextTime}\n\nВсе краны на таймере`, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
    }

    let text = `✅ *ГОТОВЫ К СБОРУ: ${ready.length}*\n\n`;
    ready.forEach(f => {
        text += `• *${f.name}* [${f.crypto}]\n  🔗 ${f.url}\n\n`;
    });

    const inlineButtons = ready.slice(0, 5).map(f => ([{
        text: `🌐 ${f.name}`,
        url: f.url
    }]));
    inlineButtons.push([{ text: '✓ Отметить все посещёнными', callback_data: 'mark_all' }]);

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineButtons }
    });
}

async function sendFaucetPayBalance(chatId) {
    const msg = await bot.sendMessage(chatId, '⏳ Загружаю баланс FaucetPay...');

    if (!CONFIG.FP_API_KEY || CONFIG.FP_API_KEY === 'ВАШ_FAUCETPAY_API_KEY') {
        return bot.sendMessage(chatId, '⚠️ *FaucetPay API ключ не настроен*', { parse_mode: 'Markdown' });
    }

    // FaucetPay поддерживает: BTC, ETH, LTC, DOGE, DASH, DGB, ZEC, BCH, BNB, TRX, XRP
    // SOL НЕ поддерживается FaucetPay
    const currencies = ['BTC', 'ETH', 'LTC', 'DOGE'];
    const balances = {};
    let totalUSD = 0;
    const DOGE_PRICE = 0.12;

    for (const cr of currencies) {
        try {
            const response = await fetch('https://faucetpay.io/api/v1/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}`
            });
            const d = await response.json();
            if (d.status === 200) {
                balances[cr] = parseFloat(d.balance) || 0;
                const price = cr === 'DOGE' ? DOGE_PRICE : (PRICES[cr] || 0);
                totalUSD += balances[cr] * price;
            } else {
                balances[cr] = -1; // ошибка API
                console.log(`FP ${cr} error:`, d.message);
            }
        } catch (e) {
            balances[cr] = -2; // ошибка сети
            console.log(`FP ${cr} fetch error:`, e.message);
        }
    }

    const fmt = (cr, price) => {
        const b = balances[cr];
        if (b === undefined) return '➖ не проверялся';
        if (b < 0) return '⚠️ нет доступа';
        if (b === 0) return '0.00000000 (пусто)';
        return `${b.toFixed(8)} ≈ $${(b * price).toFixed(4)}`;
    };

    let text = `💳 *БАЛАНС FAUCETPAY*\n\n`;
    text += `₿ BTC: ${fmt('BTC', PRICES.BTC)}\n`;
    text += `Ξ ETH: ${fmt('ETH', PRICES.ETH)}\n`;
    text += `Ł LTC: ${fmt('LTC', PRICES.LTC)}\n`;
    text += `Ð DOGE: ${fmt('DOGE', DOGE_PRICE)}\n`;
    text += `\n📌 _SOL не поддерживается FaucetPay_\n`;
    text += `\n━━━━━━━━━━━━━\n`;
    text += `💵 *Итого: ~$${totalUSD.toFixed(4)}*\n`;
    text += `💴 *≈ ${(totalUSD * 100).toFixed(2)} ₽*\n`;
    text += `\n⚠️ Если видите "нет доступа" — проверьте API ключ на faucetpay.io/account/api`;
    text += `\n\n📅 ${new Date().toLocaleTimeString('ru')}`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔄 Обновить', callback_data: 'fp_balance' }],
                [{ text: '📊 Все балансы', callback_data: 'balances' }],
            ]
        }
    });
}


async function findLostCoins(chatId) {
    bot.sendMessage(chatId, '🔍 *ПОИСК ОСТАТКОВ МОНЕТ*\n\n⏳ Анализирую все источники...', { parse_mode: 'Markdown' });

    let report = '🔍 *ОТЧЁТ: НАЙДЕННЫЕ ОСТАТКИ*\n\n';
    let totalFound = 0;
    let found = false;

    // 1. Остатки на кранах
    report += '━━━ 🚰 *ОСТАТКИ НА КРАНАХ* ━━━\n\n';
    let faucetTotal = { BTC:0, ETH:0, LTC:0, SOL:0 };
    let withdrawReady = [];

    faucets.forEach(f => {
        if ((f.bal || 0) > 0) {
            faucetTotal[f.crypto] = (faucetTotal[f.crypto] || 0) + (f.bal || 0);
            const usd = (f.bal || 0) * (PRICES[f.crypto] || 0);
            report += `• *${f.name}*: ${(f.bal||0).toFixed(6)} ${f.crypto} (~$${usd.toFixed(4)})\n`;
            if (usd >= 0.5) withdrawReady.push(f);
            found = true;
        }
    });

    if (!found) report += '_Нет записанных балансов. Обновите в приложении._\n';

    let faucetUSD = 0;
    report += '\n📊 Суммарно на кранах:\n';
    for (const [cr, amt] of Object.entries(faucetTotal)) {
        if (amt > 0) {
            const usd = amt * (PRICES[cr] || 0);
            faucetUSD += usd;
            report += `  ${cr}: ${amt.toFixed(8)} ≈ $${usd.toFixed(4)}\n`;
        }
    }
    totalFound += faucetUSD;

    // 2. FaucetPay балансы
    report += '\n━━━ 💳 *FAUCETPAY ОСТАТКИ* ━━━\n\n';
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        const currencies = ['BTC','ETH','LTC','SOL'];
        let fpTotal = 0;
        for (const cr of currencies) {
            try {
                const r = await fetch('https://faucetpay.io/api/v1/balance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}` });
                const d = await r.json();
                if (d.status === 200 && parseFloat(d.balance) > 0) {
                    const bal = parseFloat(d.balance);
                    const usd = bal * (PRICES[cr] || 0);
                    fpTotal += usd;
                    totalFound += usd;
                    report += `• ${cr}: ${bal.toFixed(8)} ≈ $${usd.toFixed(4)}\n`;
                    if (usd >= 1.0) report += '  ⚠️ _Рекомендуется вывести!_\n';
                }
            } catch(e) {}
        }
        if (fpTotal === 0) report += '_Баланс FaucetPay пуст_\n';
    } else {
        report += '_FaucetPay не подключен_\n';
    }

    // 3. Блокчейн адреса
    report += '\n━━━ ⛓ *БЛОКЧЕЙН АДРЕСА* ━━━\n\n';
    let blockchainFound = false;
    for (const [cr, addrs] of Object.entries(userAddresses)) {
        for (const addr of addrs) {
            const bal = await getBlockchainBalance(cr, addr);
            if (bal !== null && bal > 0) {
                const usd = bal * (PRICES[cr] || 0);
                totalFound += usd;
                blockchainFound = true;
                report += `• ${cr} [${addr.slice(0,12)}...]: ${bal.toFixed(8)} ≈ $${usd.toFixed(4)}\n`;
            }
        }
    }
    if (!blockchainFound) report += '_Добавьте адреса командой /addaddr_\n';

    // Итог
    report += `\n━━━━━━━━━━━━━━━━━\n`;
    report += `💰 *ИТОГО НАЙДЕНО: ~$${totalFound.toFixed(4)}*\n`;
    report += `💴 *≈ ${(totalFound * 100).toFixed(2)} ₽*\n\n`;

    if (withdrawReady.length > 0) {
        report += `⚡ *Готовы к выводу (${withdrawReady.length}):*\n`;
        withdrawReady.forEach(f => {
            report += `  → ${f.name}: ${(f.bal||0).toFixed(6)} ${f.crypto}\n`;
        });
    }
    report += `\n📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, report, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💼 Консолидировать', callback_data: 'consolidate' }],
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
                [{ text: '🔄 Обновить поиск', callback_data: 'find_coins' }],
            ]
        }
    });
}

// ============================================================
// 💼 КОНСОЛИДАЦИЯ СРЕДСТВ
// ============================================================

async function consolidateReport(chatId) {
    bot.sendMessage(chatId, '💼 *КОНСОЛИДАЦИЯ СРЕДСТВ*\n\n⏳ Анализирую...', { parse_mode: 'Markdown' });

    const groups = { BTC:[], ETH:[], LTC:[], SOL:[] };
    faucets.forEach(f => { if (f.bal > 0) groups[f.crypto]?.push(f); });

    const fpBal = {};
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        for (const cr of ['BTC','ETH','LTC','SOL']) {
            try {
                const r = await fetch('https://faucetpay.io/api/v1/balance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}` });
                const d = await r.json();
                if (d.status === 200) fpBal[cr] = parseFloat(d.balance) || 0;
            } catch(e) { fpBal[cr] = 0; }
        }
    }

    let report = '💼 *ПЛАН КОНСОЛИДАЦИИ*\n\n';
    const FEES = { BTC: 0.00003, ETH: 0.001, LTC: 0.001, SOL: 0.000005 };
    const MIN_WITHDRAW = { BTC: 0.0001, ETH: 0.005, LTC: 0.01, SOL: 0.05 };
    let totalConsolidated = 0;

    for (const [cr, list] of Object.entries(groups)) {
        if (list.length === 0 && !fpBal[cr]) continue;
        const faucetSum = list.reduce((a,f) => a + (f.bal||0), 0);
        const fpSum = fpBal[cr] || 0;
        const total = faucetSum + fpSum;
        const totalUSD = total * (PRICES[cr] || 0);
        const feeUSD = FEES[cr] * (PRICES[cr] || 0);

        report += `━━━ *${cr}* ━━━\n`;
        report += `📦 На кранах: ${faucetSum.toFixed(8)}\n`;
        report += `💳 FaucetPay: ${fpSum.toFixed(8)}\n`;
        report += `📊 Итого: *${total.toFixed(8)}* (~$${totalUSD.toFixed(4)})\n`;
        report += `⛽ Комиссия: ~$${feeUSD.toFixed(4)}\n`;

        if (total >= MIN_WITHDRAW[cr]) {
            const profit = totalUSD - feeUSD;
            report += `✅ *ВЫГОДНО ВЫВЕСТИ!* Профит: ~$${profit.toFixed(4)}\n`;
            totalConsolidated += profit;
        } else {
            const needed = MIN_WITHDRAW[cr] - total;
            report += `⏳ Ещё нужно: ${needed.toFixed(8)} ${cr}\n`;
        }
        report += '\n';
    }

    report += `━━━━━━━━━━━━━━━━━\n`;
    report += `💵 *К выводу: ~$${totalConsolidated.toFixed(4)}*\n`;
    report += `💴 *≈ ${(totalConsolidated*100).toFixed(2)} ₽*\n\n`;
    report += `📋 *ПЛАН ВЫВОДА:*\n`;
    report += `*1.* Соберите всё на FaucetPay\n`;
    report += `*2.* FaucetPay → Withdraw когда сумма > $1\n`;
    report += `*3.* Укажите основной кошелёк\n`;
    report += `*4.* Ждите 10-30 минут\n\n`;
    report += `📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, report, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔍 Найти остатки', callback_data: 'find_coins' }],
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
                [{ text: '🔄 Обновить', callback_data: 'consolidate' }],
            ]
        }
    });
}

// ============================================================
// ⛓ ПРОВЕРКА БЛОКЧЕЙН АДРЕСОВ (без приватных ключей!)
// ============================================================

async function getBlockchainBalance(crypto, address) {
    try {
        if (crypto === 'BTC') {
            const r = await fetch(`https://blockchain.info/balance?active=${address}`);
            const d = await r.json();
            return d[address] ? d[address].final_balance / 1e8 : 0;
        }
        if (crypto === 'ETH') {
            const r = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`);
            const d = await r.json();
            return d.result ? parseInt(d.result) / 1e18 : 0;
        }
        if (crypto === 'LTC') {
            const r = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
            const d = await r.json();
            return d.balance ? d.balance / 1e8 : 0;
        }
        if (crypto === 'SOL') {
            const r = await fetch(`https://api.mainnet-beta.solana.com`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBalance', params:[address] })
            });
            const d = await r.json();
            return d.result ? d.result.value / 1e9 : 0;
        }
    } catch(e) { return null; }
    return null;
}

async function checkAddress(chatId, address) {
    bot.sendMessage(chatId, `⛓ Проверяю адрес: \`${address.slice(0,20)}...\``, { parse_mode: 'Markdown' });

    // Определяем тип адреса автоматически
    let crypto = null;
    if (address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3')) crypto = 'BTC';
    else if (address.startsWith('0x') && address.length === 42) crypto = 'ETH';
    else if (address.startsWith('ltc1') || address.startsWith('L') || address.startsWith('M')) crypto = 'LTC';
    else if (address.length >= 32 && address.length <= 44) crypto = 'SOL';

    if (!crypto) {
        return bot.sendMessage(chatId, '❌ Не удалось определить тип адреса.\n\nПоддерживаются: BTC, ETH, LTC, SOL', { parse_mode: 'Markdown' });
    }

    const bal = await getBlockchainBalance(crypto, address);

    if (bal === null) {
        return bot.sendMessage(chatId, `⚠️ Ошибка запроса к блокчейну для ${crypto}.
Попробуйте позже.`);
    }

    const usd = bal * (PRICES[crypto] || 0);
    const rub = usd * 100;
    const status = bal > 0 ? '✅ Есть средства!' : '🔘 Баланс нулевой';

    const text = `⛓ *РЕЗУЛЬТАТ ПРОВЕРКИ АДРЕСА*

${status}

📍 Адрес: \`${address.slice(0,20)}...\`
🔑 Тип: *${crypto}*
💰 Баланс: *${bal.toFixed(8)} ${crypto}*
💵 ≈ $${usd.toFixed(4)}
💴 ≈ ${rub.toFixed(2)} ₽

📅 ${new Date().toLocaleTimeString('ru')}`;

    const explorerUrls = {
        BTC: `https://blockchain.com/explorer/addresses/BTC/${address}`,
        ETH: `https://etherscan.io/address/${address}`,
        LTC: `https://blockchair.com/litecoin/address/${address}`,
        SOL: `https://solscan.io/account/${address}`,
    };

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌐 Посмотреть в блокчейне', url: explorerUrls[crypto] }],
                [{ text: '🔍 Найти другие остатки', callback_data: 'find_coins' }],
            ]
        }
    });
}

// Добавить адрес для отслеживания
bot.onText(/\/addaddr (.+)/, (msg, match) => {
    const addr = match[1].trim();
    let crypto = null;
    if (addr.startsWith('bc1') || addr.startsWith('1') || addr.startsWith('3')) crypto = 'BTC';
    else if (addr.startsWith('0x') && addr.length === 42) crypto = 'ETH';
    else if (addr.startsWith('ltc1') || addr.startsWith('L') || addr.startsWith('M')) crypto = 'LTC';
    else if (addr.length >= 32 && addr.length <= 44) crypto = 'SOL';

    if (!crypto) {
        bot.sendMessage(msg.chat.id, '❌ Неизвестный формат адреса');
        return;
    }

    if (!userAddresses[crypto].includes(addr)) {
        userAddresses[crypto].push(addr);
        bot.sendMessage(msg.chat.id, 
            `✅ *Адрес добавлен для мониторинга*

🔑 ${crypto}: \`${addr.slice(0,20)}...\`

Теперь /find будет проверять этот адрес`, 
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(msg.chat.id, '⚠️ Этот адрес уже добавлен');
    }
});

// Список отслеживаемых адресов
bot.onText(/\/myaddrs/, (msg) => {
    let text = '📋 *МОИ ОТСЛЕЖИВАЕМЫЕ АДРЕСА*\n\n';
    let hasAddrs = false;
    for (const [cr, addrs] of Object.entries(userAddresses)) {
        if (addrs.length > 0) {
            hasAddrs = true;
            text += `*${cr}:*
`;
            addrs.forEach((a, i) => {
                text += `  ${i+1}. \`${a.slice(0,20)}...\`
`;
            });
            text += '\n';
        }
    }
    if (!hasAddrs) text += '_Нет добавленных адресов_\n\nДобавьте: /addaddr [адрес]';
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});


// ============================================================
// 🔍 ПОИСК НОВЫХ КРАНОВ
// ============================================================

// База известных кранов (обновляется)
const KNOWN_FAUCETS = {
    BTC: [
        { name: 'FreeBitco.in',     url: 'https://freebitco.in',            interval: '60 мин',  min: '0.0003 BTC', pays: 'Прямо',     rating: '⭐⭐⭐⭐⭐' },
        { name: 'Moon Bitcoin',     url: 'https://moonbitcoin.io',          interval: '5 мин',   min: 'нет мин',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Cointiply',        url: 'https://cointiply.com',           interval: '60 мин',  min: '0.0001 BTC', pays: 'FaucetPay', rating: '⭐⭐⭐⭐⭐' },
        { name: 'FireFaucet',       url: 'https://firefaucet.win',          interval: '60 мин',  min: 'от $0.1',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Rollercoin',       url: 'https://rollercoin.com',          interval: 'игра',    min: '0.0001 BTC', pays: 'Прямо',     rating: '⭐⭐⭐⭐⭐' },
        { name: 'Faucet.cash',      url: 'https://faucet.cash',             interval: '60 мин',  min: 'нет мин',    pays: 'FaucetPay', rating: '⭐⭐⭐' },
        { name: 'CoinPayu',         url: 'https://coinpayu.com',            interval: '30 мин',  min: '$0.5',       pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'AdBTC',            url: 'https://adbtc.top',               interval: 'просмотр',min: '0.0001 BTC', pays: 'FaucetPay', rating: '⭐⭐⭐' },
    ],
    ETH: [
        { name: 'FireFaucet ETH',   url: 'https://firefaucet.win',          interval: '60 мин',  min: 'от $0.1',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'AllCoins ETH',     url: 'https://allcoins.pw',             interval: '60 мин',  min: '0.01 ETH',   pays: 'FaucetPay', rating: '⭐⭐⭐' },
        { name: 'Free-Ethereum',    url: 'https://free-ethereum.io',        interval: '60 мин',  min: '0.005 ETH',  pays: 'Прямо',     rating: '⭐⭐⭐' },
        { name: 'Ether Faucet',     url: 'https://etherfaucet.xyz',         interval: '4 ч',     min: '0.0001 ETH', pays: 'FaucetPay', rating: '⭐⭐⭐' },
        { name: 'Faucetcrypto ETH', url: 'https://faucetcrypto.com',        interval: '30 мин',  min: '$0.2',       pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
    ],
    LTC: [
        { name: 'Moon Litecoin',    url: 'https://moonlitecoin.com',        interval: '5 мин',   min: 'нет мин',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Free-Litecoin',    url: 'https://free-litecoin.com',       interval: '60 мин',  min: '0.01 LTC',   pays: 'Прямо',     rating: '⭐⭐⭐⭐' },
        { name: 'FireFaucet LTC',   url: 'https://firefaucet.win',          interval: '60 мин',  min: 'от $0.1',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Litecoin-Faucet',  url: 'https://litecoin-faucet.net',     interval: '2 ч',     min: '0.02 LTC',   pays: 'Прямо',     rating: '⭐⭐⭐' },
        { name: 'Faucetcrypto LTC', url: 'https://faucetcrypto.com',        interval: '30 мин',  min: '$0.2',       pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Dutchy LTC',       url: 'https://dutchycorp.ovh',          interval: '60 мин',  min: '$0.5',       pays: 'FaucetPay', rating: '⭐⭐⭐' },
    ],
    SOL: [
        { name: 'FireFaucet SOL',   url: 'https://firefaucet.win',          interval: '60 мин',  min: 'от $0.1',    pays: 'FaucetPay', rating: '⭐⭐⭐⭐' },
        { name: 'Sol-Faucet',       url: 'https://sol-faucet.com',          interval: '60 мин',  min: '0.001 SOL',  pays: 'Прямо',     rating: '⭐⭐⭐' },
        { name: 'Stakely SOL',      url: 'https://stakely.io/faucet/solana-sol', interval: '24 ч', min: 'нет мин', pays: 'Прямо',    rating: '⭐⭐⭐⭐' },
        { name: 'SolFaucet.io',     url: 'https://solfaucet.io',            interval: '60 мин',  min: 'нет мин',    pays: 'Прямо',     rating: '⭐⭐⭐' },
        { name: 'AllCoins SOL',     url: 'https://allcoins.pw',             interval: '60 мин',  min: '0.01 SOL',   pays: 'FaucetPay', rating: '⭐⭐⭐' },
    ],
};

// /search [crypto] — поиск кранов по валюте
bot.onText(/\/search(?:\s+(\w+))?/, (msg, match) => {
    const query = (match[1] || 'ALL').toUpperCase();
    searchFaucets(msg.chat.id, query);
});

function searchFaucets(chatId, query) {
    const cryptos = query === 'ALL' ? ['BTC','ETH','LTC','SOL'] : [query];
    let found = false;

    for (const cr of cryptos) {
        if (!KNOWN_FAUCETS[cr]) continue;
        found = true;
        const list = KNOWN_FAUCETS[cr];
        let text = `🔍 *КРАНЫ ${cr} (${list.length} найдено)*\n\n`;

        const buttons = [];
        list.forEach((f, i) => {
            text += `${f.rating} *${f.name}*\n`;
            text += `  ⏱ ${f.interval} | 💰 мин: ${f.min}\n`;
            text += `  💳 ${f.pays}\n\n`;
            buttons.push([{ text: `🌐 ${f.name}`, url: f.url }]);
        });

        // Кнопка добавить все
        buttons.push([{ text: `➕ Добавить все ${cr} краны`, callback_data: `add_all_${cr}` }]);

        bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
        });
    }

    if (!found) {
        bot.sendMessage(chatId,
            `❌ Не найдено кранов для: ${query}\n\nИспользуйте:\n/search BTC\n/search ETH\n/search LTC\n/search SOL\n/search ALL`,
            { parse_mode: 'Markdown' }
        );
    }
}

// Добавить все краны одной валюты
bot.on('callback_query', (query) => {
    if (query.data && query.data.startsWith('add_all_')) {
        const cr = query.data.replace('add_all_', '');
        const list = KNOWN_FAUCETS[cr] || [];
        let added = 0;
        list.forEach(f => {
            const exists = faucets.find(x => x.url === f.url && x.crypto === cr);
            if (!exists) {
                faucets.push({
                    id: Date.now() + Math.random(),
                    name: f.name, url: f.url, crypto: cr,
                    interval: 60, enabled: true,
                    minW: f.min, bal: 0, last: null, vis: 0
                });
                added++;
            }
        });
        bot.answerCallbackQuery(query.id, { text: `✅ Добавлено ${added} кранов ${cr}!` });
        bot.sendMessage(query.message.chat.id,
            `✅ *Добавлено ${added} новых кранов ${cr}*\nВсего кранов: ${faucets.length}\n\n/faucets — посмотреть все`,
            { parse_mode: 'Markdown' }
        );
    }
});

// ============================================================
// 🤖 УМНЫЙ АВТОСБОР — уведомления с одним кликом
// ============================================================

let smartAutoRunning = false;
let smartAutoTimer = null;
let currentFaucetIdx = 0;

function startSmartAuto(chatId) {
    if (smartAutoTimer) clearInterval(smartAutoTimer);
    smartAutoRunning = true;
    currentFaucetIdx = 0;

    bot.sendMessage(chatId,
        `🤖 *УМНЫЙ АВТОСБОР ЗАПУЩЕН*\n\nКаждые 3 минуты я буду отправлять краны по одному.\nПросто нажмите кнопку — кран откроется!\n\n✅ Нажимайте CLAIM/ROLL на сайте\n✅ Возвращайтесь и нажмите следующий`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );

    // Отправляем первый кран сразу
    sendNextFaucetToClick(chatId);

    // Потом каждые 3 минуты
    smartAutoTimer = setInterval(() => {
        if (!smartAutoRunning) return;
        sendNextFaucetToClick(chatId);
    }, 3 * 60 * 1000);
}

function sendNextFaucetToClick(chatId) {
    const ready = faucets.filter(f => f.enabled && isReady(f));
    if (!ready.length) {
        // Ищем ближайший
        const next = faucets.filter(f => f.enabled)
            .sort((a,b) => getSecsLeft(a) - getSecsLeft(b))[0];
        const waitTime = next ? getTimeLeft(next) : 'неизвестно';
        bot.sendMessage(chatId,
            `💤 Все краны на таймере\n⏰ Следующий через: *${waitTime}*`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    const f = ready[currentFaucetIdx % ready.length];
    currentFaucetIdx++;

    const text = `🚰 *${f.name}* [${f.crypto}]\n\n💰 Мин. вывод: ${f.minW}\n⏱ Интервал: ${f.interval} мин\n\n👇 *Нажмите открыть → кликните CLAIM/ROLL → вернитесь*`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: `🌐 ОТКРЫТЬ ${f.name}`, url: f.url }],
                [
                    { text: '✅ Посетил!', callback_data: `visit_${f.id}` },
                    { text: '⏭ Следующий', callback_data: 'next_faucet' },
                ],
                [{ text: '⏹ Стоп', callback_data: 'stop_smart_auto' }],
            ]
        }
    });
}

function stopSmartAuto(chatId) {
    smartAutoRunning = false;
    if (smartAutoTimer) clearInterval(smartAutoTimer);
    bot.sendMessage(chatId, '⏹ *Умный автосбор остановлен*', { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
}


// ============================================================
// 🤖 TELEGRAM БОТЫ-КРАНЫ (платят за нажатие кнопки)
// ============================================================

const TG_BOTS = [
    // BTC боты
    { name: 'CryptoBot',        link: 'https://t.me/CryptoBot',           crypto: 'BTC',  type: 'кошелёк+кран', interval: '24ч',  reward: 'до $1',    rating: '⭐⭐⭐⭐⭐', desc: 'Официальный крипто-кошелёк Telegram' },
    { name: 'BitcoinBonusBot',  link: 'https://t.me/BitcoinBonusBot',     crypto: 'BTC',  type: 'кран',         interval: '1ч',   reward: 'сатоши',   rating: '⭐⭐⭐',   desc: 'Ежечасные выплаты BTC' },
    { name: 'BtcpayBot',        link: 'https://t.me/BtcpayBot',           crypto: 'BTC',  type: 'кран',         interval: '6ч',   reward: 'сатоши',   rating: '⭐⭐⭐',   desc: 'BTC каждые 6 часов' },
    { name: 'FreeBitcoinBot',   link: 'https://t.me/FreeBitcoinBot',      crypto: 'BTC',  type: 'кран',         interval: '1ч',   reward: 'сатоши',   rating: '⭐⭐⭐',   desc: 'Бесплатные сатоши' },
    // TON боты (самые популярные в Telegram)
    { name: 'Notcoin',          link: 'https://t.me/notcoin_bot',         crypto: 'TON',  type: 'тапалка',      interval: 'авто', reward: 'монеты',   rating: '⭐⭐⭐⭐⭐', desc: 'Нажимай и зарабатывай TON' },
    { name: 'Hamster Kombat',   link: 'https://t.me/hamster_kombat_bot',  crypto: 'TON',  type: 'тапалка',      interval: 'авто', reward: 'HMSTR',    rating: '⭐⭐⭐⭐⭐', desc: 'Миллионы пользователей' },
    { name: 'Blum',             link: 'https://t.me/BlumCryptoBot',       crypto: 'TON',  type: 'мини-игра',    interval: '8ч',   reward: 'BLUM',     rating: '⭐⭐⭐⭐⭐', desc: 'Популярный TON бот' },
    { name: 'TapSwap',          link: 'https://t.me/tapswap_mirror_bot',  crypto: 'TON',  type: 'тапалка',      interval: 'авто', reward: 'TAPS',     rating: '⭐⭐⭐⭐',  desc: 'Тапай и зарабатывай' },
    { name: 'Major',            link: 'https://t.me/major',               crypto: 'TON',  type: 'задания',      interval: '24ч',  reward: 'MAJOR',    rating: '⭐⭐⭐⭐',  desc: 'Задания за крипту' },
    { name: 'MemeFi',           link: 'https://t.me/memefi_coin_bot',     crypto: 'TON',  type: 'тапалка',      interval: 'авто', reward: 'MEMEFI',   rating: '⭐⭐⭐⭐',  desc: 'Мем монеты' },
    { name: 'Tomarket',         link: 'https://t.me/Tomarket_ai_bot',     crypto: 'TON',  type: 'фарминг',      interval: '12ч',  reward: 'TOMA',     rating: '⭐⭐⭐⭐',  desc: 'Фарминг монет' },
    { name: 'TimeFarm',         link: 'https://t.me/TimeFarmCryptoBot',   crypto: 'TON',  type: 'фарминг',      interval: '8ч',   reward: 'TIME',     rating: '⭐⭐⭐⭐',  desc: 'Фарминг TIME токенов' },
    { name: 'OKX Racer',        link: 'https://t.me/OKX_official_bot',    crypto: 'TON',  type: 'игра',         interval: '24ч',  reward: 'OKX',      rating: '⭐⭐⭐⭐',  desc: 'От биржи OKX' },
    // ETH боты
    { name: 'EtherFaucetBot',   link: 'https://t.me/EtherFaucetBot',      crypto: 'ETH',  type: 'кран',         interval: '24ч',  reward: 'wei',      rating: '⭐⭐⭐',   desc: 'Бесплатный ETH' },
    // USDT боты
    { name: 'Send',             link: 'https://t.me/wallet',              crypto: 'USDT', type: 'кошелёк',      interval: '24ч',  reward: 'задания',  rating: '⭐⭐⭐⭐⭐', desc: 'Кошелёк + задания' },
    { name: 'CryptoMinerBot',   link: 'https://t.me/CryptoMinerBot',      crypto: 'USDT', type: 'майнинг',      interval: '8ч',   reward: 'USDT',     rating: '⭐⭐⭐⭐',  desc: 'Симуляция майнинга' },
    // SOL боты
    { name: 'SolanaFaucetBot',  link: 'https://t.me/SolanaFaucetBot',     crypto: 'SOL',  type: 'кран',         interval: '24ч',  reward: 'SOL',      rating: '⭐⭐⭐',   desc: 'Бесплатный SOL' },
    // LTC боты
    { name: 'LTCFaucetBot',     link: 'https://t.me/LTCFaucetBot',        crypto: 'LTC',  type: 'кран',         interval: '24ч',  reward: 'LTC',      rating: '⭐⭐⭐',   desc: 'Бесплатный LTC' },
];

// Расписание TG ботов для автосбора
let tgBotSchedule = [];
let tgAutoTimer = null;
let tgAutoRunning = false;

bot.onText(/\/tgbots(?:\s+(\w+))?/, (msg, match) => {
    const filter = (match[1] || 'ALL').toUpperCase();
    sendTGBotsList(msg.chat.id, filter);
});

function sendTGBotsList(chatId, filter) {
    const types = {
        'BTC': 'BTC', 'ETH': 'ETH', 'SOL': 'SOL',
        'LTC': 'LTC', 'TON': 'TON', 'USDT': 'USDT',
        'TAPPERS': 'тапалка', 'FARM': 'фарминг',
    };

    let list = TG_BOTS;
    if (filter !== 'ALL') {
        if (types[filter]) {
            list = TG_BOTS.filter(b =>
                b.crypto === filter || b.type === types[filter]
            );
        }
    }

    // Группируем по криптовалюте
    const groups = {};
    list.forEach(b => {
        if (!groups[b.crypto]) groups[b.crypto] = [];
        groups[b.crypto].push(b);
    });

    for (const [cr, bots] of Object.entries(groups)) {
        let text = `🤖 *TELEGRAM БОТЫ — ${cr}*\n\n`;
        const buttons = [];

        bots.forEach(b => {
            text += `${b.rating} *${b.name}*\n`;
            text += `  💰 ${b.reward} | ⏱ ${b.interval}\n`;
            text += `  📝 ${b.desc}\n\n`;
            buttons.push([{ text: `▶️ Открыть ${b.name}`, url: b.link }]);
        });

        buttons.push([{ text: `⏰ Добавить ${cr} боты в расписание`, callback_data: `tg_schedule_${cr}` }]);

        bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons }
        });
    }
}

// Добавить боты в расписание автосбора
function addToSchedule(crypto, chatId) {
    const bots = TG_BOTS.filter(b => b.crypto === crypto);
    let added = 0;
    bots.forEach(b => {
        if (!tgBotSchedule.find(s => s.link === b.link)) {
            tgBotSchedule.push({ ...b, lastVisit: null });
            added++;
        }
    });
    bot.sendMessage(chatId,
        `✅ *Добавлено ${added} ботов ${crypto} в расписание*\nВсего в расписании: ${tgBotSchedule.length}\n\nЗапустите автосбор: /tgauto`,
        { parse_mode: 'Markdown' }
    );
}

// ============================================================
// 🤖 АВТОСБОР TG БОТОВ (фоновый режим)
// ============================================================

bot.onText(/\/tgauto/, (msg) => {
    if (tgAutoRunning) {
        stopTGAuto(msg.chat.id);
    } else {
        startTGAuto(msg.chat.id);
    }
});

function startTGAuto(chatId) {
    if (!tgBotSchedule.length) {
        // Добавляем все TON боты по умолчанию
        TG_BOTS.forEach(b => {
            if (!tgBotSchedule.find(s => s.link === b.link)) {
                tgBotSchedule.push({ ...b, lastVisit: null });
            }
        });
    }

    tgAutoRunning = true;
    if (tgAutoTimer) clearInterval(tgAutoTimer);

    bot.sendMessage(chatId,
        `🤖 *АВТОСБОР TG БОТОВ ЗАПУЩЕН*\n\n✅ Работает в фоновом режиме\n📋 Ботов в расписании: ${tgBotSchedule.length}\n⏰ Проверка каждые 2 минуты\n\n*Как пользоваться:*\n1. Бот пришлёт уведомление\n2. Нажмите кнопку → откроется бот-кран\n3. Нажмите кнопку в боте (Claim/Tap/Collect)\n4. Вернитесь → нажмите ✅\n\n⏹ Остановить: /tgauto`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );

    // Запускаем сразу
    processTGBotQueue(chatId);

    // Повторяем каждые 2 минуты
    tgAutoTimer = setInterval(() => {
        if (tgAutoRunning) processTGBotQueue(chatId);
    }, 2 * 60 * 1000);
}

function stopTGAuto(chatId) {
    tgAutoRunning = false;
    if (tgAutoTimer) { clearInterval(tgAutoTimer); tgAutoTimer = null; }
    bot.sendMessage(chatId,
        `⏹ *Автосбор TG ботов остановлен*\n\nСтатистика:\n• Ботов в расписании: ${tgBotSchedule.length}\n• Посещённых: ${tgBotSchedule.filter(b => b.lastVisit).length}`,
        { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
    );
}

function processTGBotQueue(chatId) {
    const ready = tgBotSchedule.filter(b => {
        if (!b.lastVisit) return true;
        const intervalMs = parseIntervalToMs(b.interval);
        return (Date.now() - b.lastVisit) >= intervalMs;
    });

    if (!ready.length) {
        const next = tgBotSchedule
            .filter(b => b.lastVisit)
            .sort((a,b) => {
                const ia = parseIntervalToMs(a.interval);
                const ib = parseIntervalToMs(b.interval);
                return (a.lastVisit + ia) - (b.lastVisit + ib);
            })[0];

        if (next) {
            const timeLeft = Math.max(0, next.lastVisit + parseIntervalToMs(next.interval) - Date.now());
            const mins = Math.round(timeLeft / 60000);
            // Тихо ждём — не спамим
            console.log(`TG Auto: все боты на таймере. Следующий через ${mins} мин`);
        }
        return;
    }

    // Отправляем первый готовый
    const b = ready[0];
    bot.sendMessage(chatId,
        `🤖 *${b.name}* [${b.crypto}]\n\n💰 ${b.reward}\n${b.rating} ${b.desc}\n\n👇 *Нажмите → откройте бота → нажмите кнопку сбора!*`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `▶️ ОТКРЫТЬ ${b.name}`, url: b.link }],
                    [
                        { text: '✅ Собрал!', callback_data: `tg_collected_${encodeBot(b.name)}` },
                        { text: '⏭ Пропустить', callback_data: `tg_skip_${encodeBot(b.name)}` },
                    ],
                    [{ text: '⏹ Стоп автосбор', callback_data: 'tg_stop' }],
                ]
            }
        }
    );
}

function parseIntervalToMs(interval) {
    if (!interval || interval === 'авто') return 4 * 60 * 60 * 1000; // 4 часа
    if (interval.includes('мин')) return parseInt(interval) * 60 * 1000;
    if (interval.includes('ч')) return parseInt(interval) * 60 * 60 * 1000;
    if (interval.includes('24')) return 24 * 60 * 60 * 1000;
    if (interval.includes('8')) return 8 * 60 * 60 * 1000;
    if (interval.includes('12')) return 12 * 60 * 60 * 1000;
    return 4 * 60 * 60 * 1000;
}

function encodeBot(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
}

// ============================================================
// 💎 AIRDROP ТРЕКЕР
// ============================================================

const AIRDROPS = [
    { name: 'Hamster Kombat',  link: 'https://t.me/hamster_kombat_bot',  status: '🟢 Активен',  reward: 'HMSTR',  desc: 'Играй и получай токены' },
    { name: 'Blum',            link: 'https://t.me/BlumCryptoBot',       status: '🟢 Активен',  reward: 'BLUM',   desc: 'Фарминг токенов' },
    { name: 'TapSwap',         link: 'https://t.me/tapswap_mirror_bot',  status: '🟢 Активен',  reward: 'TAPS',   desc: 'Тапай каждый день' },
    { name: 'Tomarket',        link: 'https://t.me/Tomarket_ai_bot',     status: '🟢 Активен',  reward: 'TOMA',   desc: 'Фарминг + игры' },
    { name: 'MemeFi',          link: 'https://t.me/memefi_coin_bot',     status: '🟢 Активен',  reward: 'MEMEFI', desc: 'Мем токены' },
    { name: 'Major',           link: 'https://t.me/major',               status: '🟢 Активен',  reward: 'MAJOR',  desc: 'Звёзды → токены' },
    { name: 'OKX Racer',       link: 'https://t.me/OKX_official_bot',    status: '🟢 Активен',  reward: 'OKX',    desc: 'От биржи OKX' },
    { name: 'Yescoin',         link: 'https://t.me/theYescoin_bot',      status: '🟢 Активен',  reward: 'YES',    desc: 'Тапай и зарабатывай' },
    { name: 'TimeFarm',        link: 'https://t.me/TimeFarmCryptoBot',   status: '🟢 Активен',  reward: 'TIME',   desc: 'Фарминг TIME' },
    { name: 'Catizen',         link: 'https://t.me/catizenbot',          status: '🟡 Скоро',    reward: 'CATI',   desc: 'Игра с котами' },
];

bot.onText(/\/airdrops/, (msg) => sendAirdrops(msg.chat.id));

function sendAirdrops(chatId) {
    const active = AIRDROPS.filter(a => a.status.includes('Активен'));
    const soon   = AIRDROPS.filter(a => a.status.includes('Скоро'));

    let text = `💎 *АКТИВНЫЕ AIRDROP'Ы (${active.length})*\n\n`;
    const buttons = [];

    active.forEach(a => {
        text += `${a.status} *${a.name}*\n`;
        text += `  💰 Токен: ${a.reward}\n`;
        text += `  📝 ${a.desc}\n\n`;
        buttons.push([{ text: `▶️ ${a.name} — ${a.reward}`, url: a.link }]);
    });

    if (soon.length) {
        text += `\n⏳ *Скоро (${soon.length}):*\n`;
        soon.forEach(a => { text += `  • ${a.name} (${a.reward})\n`; });
    }

    text += `\n💡 *Совет:* Подпишитесь на все активные — каждый может принести $10-500 при листинге!`;

    buttons.push([{ text: '🤖 Добавить в автосбор', callback_data: 'add_airdrops_auto' }]);

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    });
}

// ============================================================
// 💸 ПОИСК НЕЗАБРАННЫХ НАГРАД (ваши адреса)
// ============================================================

bot.onText(/\/unclaimed/, (msg) => sendUnclaimedGuide(msg.chat.id));

function sendUnclaimedGuide(chatId) {
    const text = `💸 *НЕЗАБРАННЫЕ НАГРАДЫ*\n\nПроверьте свои адреса на наличие:\n\n1️⃣ *Staking rewards (ETH)*\n   → [etherscan.io](https://etherscan.io)\n   Введите адрес → вкладка "Staking"\n\n2️⃣ *Unclaimed airdrops*\n   → [earni.fi](https://earni.fi)\n   → [app.uniswap.org](https://app.uniswap.org)\n   Подключите кошелёк\n\n3️⃣ *Незабранные UNI/ENS токены*\n   → uniswap.org → Claim\n\n4️⃣ *Solana rewards*\n   → [solscan.io](https://solscan.io)\n   Введите SOL адрес → Rewards\n\n5️⃣ *Проверить все сети сразу*\n   → [debank.com](https://debank.com)\n   Введите адрес → показывает ВСЁ\n\n💡 Добавьте ваши адреса через /addaddr и я проверю блокчейн!`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔍 Проверить мои адреса', callback_data: 'find_coins' }],
                [{ text: "💎 Активные Airdropы", callback_data: 'show_airdrops' }],
            ]
        }
    });
}


// ============================================================
// АВТО-ОБНОВЛЕНИЕ КУРСОВ (каждые 30 минут)
// ============================================================
async function updatePrices() {
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin,solana&vs_currencies=usd');
        const d = await r.json();
        if (d.bitcoin)  PRICES.BTC = d.bitcoin.usd;
        if (d.ethereum) PRICES.ETH = d.ethereum.usd;
        if (d.litecoin) PRICES.LTC = d.litecoin.usd;
        if (d.solana)   PRICES.SOL = d.solana.usd;
        console.log(`💱 Курсы обновлены: BTC=$${PRICES.BTC} ETH=$${PRICES.ETH} LTC=$${PRICES.LTC} SOL=$${PRICES.SOL}`);
    } catch (e) {
        console.log('⚠️ Ошибка обновления курсов:', e.message);
    }
}

setInterval(updatePrices, 30 * 60 * 1000);
updatePrices();

// ============================================================
// ЕЖЕДНЕВНЫЙ ОТЧЁТ (в 09:00)
// ============================================================
function scheduleDailyReport() {
    const now = new Date();
    const next9am = new Date(now);
    next9am.setHours(9, 0, 0, 0);
    if (next9am <= now) next9am.setDate(next9am.getDate() + 1);
    const msUntil = next9am - now;

    setTimeout(() => {
        sendBalances(CONFIG.CHAT_ID);
        setInterval(() => sendBalances(CONFIG.CHAT_ID), 24 * 60 * 60 * 1000);
    }, msUntil);

    console.log(`📅 Ежедневный отчёт запланирован через ${Math.round(msUntil/3600000)}ч`);
}
scheduleDailyReport();

// ============================================================
// СТАРТОВОЕ СООБЩЕНИЕ
// ============================================================
setTimeout(() => {
    if (CONFIG.CHAT_ID && CONFIG.CHAT_ID !== 'ВАШ_CHAT_ID') {
        bot.sendMessage(CONFIG.CHAT_ID,
            `⚡ *CryptoHarvest Bot запущен!*\n\n✅ BTC + ETH + LTC + SOL\n🚰 Кранов: ${faucets.length}\n🤖 Готов к работе\n\n📅 ${new Date().toLocaleString('ru')}`,
            { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD }
        );
    }
}, 2000);

console.log(`
╔══════════════════════════════════╗
║  CryptoHarvest Bot v4.1  ⚡      ║
║  BTC + ETH + LTC + SOL           ║
║  Кранов: ${faucets.length} | 🔍 Поиск | 💼 Консол ║
╚══════════════════════════════════╝
`);

// ============================================================
// КНОПКИ МЕНЮ
// ============================================================
bot.on('message', (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;
    if (!text) return;

    // Команды
    if (text === '/start' || text.startsWith('/start')) {
        const name = msg.from.first_name || 'Пользователь';
        bot.sendMessage(chatId,
            `⚡ *CryptoHarvest v4.0*\n\nПривет, *${name}*! 👋\nКнопки меню появились внизу 👇`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [
                        ['💰 Мои кошельки', '📊 Статус'],
                        ['🚰 Найти краны',  '⚙️ Автосбор'],
                        ['💳 FaucetPay',    '📈 Балансы'],
                        ['⏰ Таймеры',      '🔍 Поиск монет'],
                        ['💼 Консолидация', 'ℹ️ Справка'],
                    ],
                    resize_keyboard: true,
                    persistent: true,
                }
            }
        );
        return;
    }
    if (text === '/help') { sendHelp(chatId); return; }
    if (text === '/status') { sendStatus(chatId); return; }
    if (text === '/balance') { sendBalances(chatId); return; }
    if (text === '/faucets') { sendFaucetsList(chatId); return; }
    if (text === '/ready') { sendReadyFaucets(chatId); return; }
    if (text === '/fp') { sendFaucetPayBalance(chatId); return; }
    if (text === '/auto') { toggleAutoCollect(chatId); return; }
    if (text === '/find') { findLostCoins(chatId); return; }
    if (text === '/consolidate') { consolidateReport(chatId); return; }

    // Кнопки меню
    if (text === '📊 Статус')         sendStatus(chatId);
    else if (text === '💰 Мои кошельки')  sendWallets(chatId);
    else if (text === '🚰 Найти краны')   sendFaucetsList(chatId);
    else if (text === '⚙️ Автосбор')      sendAutoMenu(chatId);
    else if (text === '💳 FaucetPay')     sendFaucetPayBalance(chatId);
    else if (text === '📈 Балансы')       sendBalances(chatId);
    else if (text === '⏰ Таймеры')       sendTimers(chatId);
    else if (text === '🔍 Поиск монет')   findLostCoins(chatId);
    else if (text === '💼 Консолидация')  consolidateReport(chatId);
    else if (text === '🤖 TG Боты')        sendTGBotsList(chatId, 'ALL');
    else if (text === '💎 Airdrops')    sendAirdrops(chatId);
    else if (text === '💸 Незабранные')    sendUnclaimedGuide(chatId);
    else if (text === 'ℹ️ Справка')       sendHelp(chatId);
});

// ============================================================
// INLINE КНОПКИ
// ============================================================
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'status')          sendStatus(chatId);
    else if (data === 'balances')   sendBalances(chatId);
    else if (data === 'ready')      sendReadyFaucets(chatId);
    else if (data === 'fp_balance') sendFaucetPayBalance(chatId);
    else if (data === 'timers')          sendTimers(chatId);
    else if (data === 'find_coins')      findLostCoins(chatId);
    else if (data === 'consolidate')     consolidateReport(chatId);
    else if (data.startsWith('chkaddr_')) {
        const addr = data.replace('chkaddr_', '');
        checkAddress(chatId, addr);
    }
    else if (data.startsWith('enable_')) {
        const id = parseInt(data.split('_')[1]);
        toggleFaucet(id, chatId);
    } else if (data === 'auto_on') {
        autoCollect = true;
        startAutoCollect(chatId);
        bot.answerCallbackQuery(query.id, { text: '✅ Автосбор включен!' });
    } else if (data === 'auto_off') {
        autoCollect = false;
        if (autoTimer) clearInterval(autoTimer);
        bot.sendMessage(chatId, '⏹ *Автосбор остановлен*', { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
        bot.answerCallbackQuery(query.id, { text: '⏹ Остановлен' });
    } else if (data.startsWith('visit_')) {
        const id = parseInt(data.split('_')[1]);
        markVisited(id, chatId);
        bot.answerCallbackQuery(query.id, { text: '✅ Посещение отмечено!' });
    }

    bot.answerCallbackQuery(query.id).catch(() => {});
});

// ============================================================
// ФУНКЦИИ ОТПРАВКИ СООБЩЕНИЙ
// ============================================================

function sendHelp(chatId) {
    const text = `🔧 *КОМАНДЫ БОТА*\n\n*Основные:*\n/start → Главное меню\n/help → Эта справка\n/status → Статус сборов\n/balance → Все балансы\n/faucets → Список кранов\n/ready → Готовые к сбору\n/fp → Баланс FaucetPay\n/auto → Вкл/выкл автосбор
/find → Поиск остатков монет
/consolidate → Отчёт консолидации
/checkaddr [адрес] → Проверить адрес
/search BTC → Найти BTC краны
/tgbots → Telegram боты-краны
/tgauto → Автосбор TG ботов
/airdrops → Активные airdrop'ы
/unclaimed → Незабранные награды\n\n*Кнопки меню:*\n💰 Мои кошельки → Ваши адреса\n📊 Статус → Статистика\n🚰 Найти краны → Список кранов\n⚙️ Автосбор → Управление\n💳 FaucetPay → Баланс FP\n📈 Балансы → Доходы\n⏰ Таймеры → Когда следующий\nℹ️ Справка → Эта страница\n\n_CryptoHarvest v4.0 • BTC+ETH+LTC+SOL_`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
}

function sendStatus(chatId) {
    const active = faucets.filter(f => f.enabled).length;
    const ready  = faucets.filter(f => f.enabled && isReady(f)).length;
    const total  = faucets.length;
    const btcTotal = earnings.BTC * PRICES.BTC;
    const ethTotal = earnings.ETH * PRICES.ETH;
    const ltcTotal = earnings.LTC * PRICES.LTC;
    const solTotal = earnings.SOL * PRICES.SOL;
    const allTotal = btcTotal + ethTotal + ltcTotal + solTotal;

    const text = `📊 *СТАТУС CRYPTOHARVEST*\n\n🚰 *Краны:*\n• Всего: ${total}\n• Активных: ${active}\n• Готовы к сбору: ${ready}\n\n💰 *Доходы:*\n₿ BTC: ${earnings.BTC.toFixed(6)} (~$${btcTotal.toFixed(2)})\nΞ ETH: ${earnings.ETH.toFixed(6)} (~$${ethTotal.toFixed(2)})\nŁ LTC: ${earnings.LTC.toFixed(6)} (~$${ltcTotal.toFixed(2)})\n◎ SOL: ${earnings.SOL.toFixed(6)} (~$${solTotal.toFixed(2)})\n\n💵 *Итого: ~$${allTotal.toFixed(2)} / ≈${(allTotal*100).toFixed(0)} ₽*\n\n🤖 Автосбор: ${autoCollect ? '🟢 Работает' : '🔴 Остановлен'}\n\n📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚰 Готовые краны', callback_data: 'ready' }],
                [{ text: '💳 FaucetPay баланс', callback_data: 'fp_balance' }],
                [{ text: '⏰ Таймеры', callback_data: 'timers' }],
            ]
        }
    });
}

function sendBalances(chatId) {
    const btcUSD = (earnings.BTC * PRICES.BTC).toFixed(2);
    const ethUSD = (earnings.ETH * PRICES.ETH).toFixed(2);
    const ltcUSD = (earnings.LTC * PRICES.LTC).toFixed(2);
    const solUSD = (earnings.SOL * PRICES.SOL).toFixed(2);
    const total  = (earnings.BTC*PRICES.BTC + earnings.ETH*PRICES.ETH + earnings.LTC*PRICES.LTC + earnings.SOL*PRICES.SOL).toFixed(2);
    const rub    = (parseFloat(total) * 100).toFixed(0);

    const text = `📈 *МОИ БАЛАНСЫ*\n\n₿ *BTC:* ${earnings.BTC.toFixed(8)}\n   ≈ $${btcUSD} / ≈${(btcUSD*100).toFixed(0)} ₽\n\nΞ *ETH:* ${earnings.ETH.toFixed(8)}\n   ≈ $${ethUSD} / ≈${(ethUSD*100).toFixed(0)} ₽\n\nŁ *LTC:* ${earnings.LTC.toFixed(8)}\n   ≈ $${ltcUSD} / ≈${(ltcUSD*100).toFixed(0)} ₽\n\n◎ *SOL:* ${earnings.SOL.toFixed(8)}\n   ≈ $${solUSD} / ≈${(solUSD*100).toFixed(0)} ₽\n\n━━━━━━━━━━━━━\n💵 *ИТОГО: ~$${total}*\n💴 *≈ ${rub} ₽*`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
            ]
        }
    });
}

function sendFaucetsList(chatId) {
    const groups = { BTC: [], ETH: [], LTC: [], SOL: [] };
    faucets.forEach(f => groups[f.crypto]?.push(f));

    let text = '🚰 *СПИСОК КРАНОВ*\n\n';
    for (const [cr, list] of Object.entries(groups)) {
        const ready = list.filter(f => f.enabled && isReady(f)).length;
        text += `*${cr}* (${list.filter(f=>f.enabled).length} акт. / ${ready} готовы):\n`;
        list.slice(0, 5).forEach(f => {
            const status = !f.enabled ? '⏸' : isReady(f) ? '✅' : '⏳';
            text += `  ${status} ${f.name} [${f.interval < 60 ? f.interval+'м' : Math.round(f.interval/60)+'ч'}]\n`;
        });
        text += '\n';
    }

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Только готовые', callback_data: 'ready' }],
                [{ text: '⏰ Таймеры', callback_data: 'timers' }],
            ]
        }
    });
}

function sendReadyFaucets(chatId) {
    const ready = faucets.filter(f => f.enabled && isReady(f));

    if (!ready.length) {
        const nextF = faucets.filter(f=>f.enabled && !isReady(f)).sort((a,b) => getSecsLeft(a)-getSecsLeft(b))[0];
        const nextTime = nextF ? `\n\n⏰ Следующий: *${nextF.name}* через ${getTimeLeft(nextF)}` : '';
        return bot.sendMessage(chatId, `💤 *Нет готовых кранов*${nextTime}\n\nВсе краны на таймере`, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
    }

    let text = `✅ *ГОТОВЫ К СБОРУ: ${ready.length}*\n\n`;
    ready.forEach(f => {
        text += `• *${f.name}* [${f.crypto}]\n  🔗 ${f.url}\n\n`;
    });

    const inlineButtons = ready.slice(0, 5).map(f => ([{
        text: `🌐 ${f.name}`,
        url: f.url
    }]));
    inlineButtons.push([{ text: '✓ Отметить все посещёнными', callback_data: 'mark_all' }]);

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: inlineButtons }
    });
}

async function sendFaucetPayBalance(chatId) {
    bot.sendMessage(chatId, '⏳ Загружаю баланс FaucetPay...');

    if (!CONFIG.FP_API_KEY || CONFIG.FP_API_KEY === 'ВАШ_FAUCETPAY_API_KEY') {
        return bot.sendMessage(chatId, '⚠️ *FaucetPay API ключ не настроен*\n\nДобавьте ключ в конфигурацию бота (строка FP\\_API\\_KEY)', { parse_mode: 'Markdown' });
    }

    const currencies = ['BTC', 'ETH', 'LTC', 'SOL'];
    const balances = {};
    let totalUSD = 0;

    for (const cr of currencies) {
        try {
            const r = await fetch('https://faucetpay.io/api/v1/balance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}` });
            const d = await r.json();
            if (d.status === 200) {
                balances[cr] = parseFloat(d.balance);
                totalUSD += balances[cr] * (PRICES[cr] || 0);
            } else {
                balances[cr] = null;
            }
        } catch (e) {
            balances[cr] = null;
        }
    }

    let text = `💳 *БАЛАНС FAUCETPAY*\n\n`;
    text += `₿ BTC: ${balances.BTC !== null ? balances.BTC.toFixed(8)+' ≈ $'+(balances.BTC*PRICES.BTC).toFixed(4) : '❌ ошибка'}\n`;
    text += `Ξ ETH: ${balances.ETH !== null ? balances.ETH.toFixed(8)+' ≈ $'+(balances.ETH*PRICES.ETH).toFixed(4) : '❌ ошибка'}\n`;
    text += `Ł LTC: ${balances.LTC !== null ? balances.LTC.toFixed(8)+' ≈ $'+(balances.LTC*PRICES.LTC).toFixed(4) : '❌ ошибка'}\n`;
    text += `◎ SOL: ${balances.SOL !== null ? balances.SOL.toFixed(8)+' ≈ $'+(balances.SOL*PRICES.SOL).toFixed(4) : '❌ ошибка'}\n`;
    text += `\n━━━━━━━━━━━━━\n💵 *Итого: ~$${totalUSD.toFixed(4)}*\n💴 *≈ ${(totalUSD*100).toFixed(2)} ₽*`;
    text += `\n\n📅 ${new Date().toLocaleTimeString('ru')}`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔄 Обновить', callback_data: 'fp_balance' }],
                [{ text: '📊 Все балансы', callback_data: 'balances' }],
            ]
        }
    });
}

function sendTimers(chatId) {
    const active = faucets.filter(f => f.enabled);
    if (!active.length) return bot.sendMessage(chatId, '⚠️ Нет активных кранов');

    const sorted = [...active].sort((a, b) => getSecsLeft(a) - getSecsLeft(b));
    let text = '⏰ *ТАЙМЕРЫ КРАНОВ*\n\n';

    sorted.slice(0, 15).forEach(f => {
        const ready = isReady(f);
        const icon = ready ? '✅' : '⏳';
        const time = ready ? 'ГОТОВ!' : getTimeLeft(f);
        text += `${icon} *${f.name}* [${f.crypto}]: ${time}\n`;
    });

    if (active.length > 15) text += `\n_...и ещё ${active.length-15} кранов_`;
    text += `\n\n🤖 Автосбор: ${autoCollect ? '🟢 Работает' : '🔴 Остановлен'}`;

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '✅ Готовые краны', callback_data: 'ready' }],
                [{ text: '🔄 Обновить', callback_data: 'timers' }],
            ]
        }
    });
}

function sendWallets(chatId) {
    const text = `💰 *МОИ КОШЕЛЬКИ*\n\n_Добавьте адреса в приложении CryptoHarvest → раздел 👛 Кошельки_\n\nПроверка транзакций:\n• BTC: [blockchain.com](https://blockchain.com/explorer)\n• ETH: [etherscan.io](https://etherscan.io)\n• LTC: [blockchair.com/litecoin](https://blockchair.com/litecoin)\n• SOL: [solscan.io](https://solscan.io)`;
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
}

function sendAutoMenu(chatId) {
    const text = `⚙️ *АВТОСБОР*\n\nВыберите режим:\n\n🤖 *Умный автосбор* — отправляет краны по одному с кнопкой открыть. Просто нажимайте!\n\n🔔 *Уведомления* — сообщает когда краны готовы каждые 5 мин`;
    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🤖 Умный автосбор (рекомендуется)', callback_data: 'smart_auto' }],
                [
                    { text: '🔔 Уведомления вкл', callback_data: 'auto_on' },
                    { text: '⏹ Выкл', callback_data: 'auto_off' },
                ],
                [{ text: '🚰 Найти краны', callback_data: 'find_coins' }],
            ]
        }
    });
}

function toggleAutoCollect(chatId) {
    autoCollect = !autoCollect;
    if (autoCollect) {
        startAutoCollect(chatId);
    } else {
        if (autoTimer) clearInterval(autoTimer);
        bot.sendMessage(chatId, '⏹ Автосбор *остановлен*', { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });
    }
}

function startAutoCollect(chatId) {
    if (autoTimer) clearInterval(autoTimer);
    bot.sendMessage(chatId, '✅ Автосбор *запущен!*\n\nПроверяю краны каждые 5 минут.\nНажимайте кнопку когда получите уведомление о готовом кране! 🚰', { parse_mode: 'Markdown', reply_markup: MAIN_KEYBOARD });

    autoTimer = setInterval(() => {
        checkAndNotify(chatId);
    }, CONFIG.CHECK_INTERVAL);

    checkAndNotify(chatId);
}

function checkAndNotify(chatId) {
    const ready = faucets.filter(f => f.enabled && isReady(f));
    if (!ready.length) return;

    let text = `🚰 *ГОТОВЫ К СБОРУ: ${ready.length}*\n\n`;
    ready.forEach(f => {
        text += `• *${f.name}* [${f.crypto}]\n`;
    });
    text += '\n_Нажмите кнопку для открытия крана:_';

    const buttons = ready.slice(0, 5).map(f => ([{
        text: `🌐 ${f.name} (${f.crypto})`,
        url: f.url
    }]));

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: buttons }
    });
}

function toggleFaucet(id, chatId) {
    const f = faucets.find(f => f.id === id);
    if (f) {
        f.enabled = !f.enabled;
        bot.sendMessage(chatId, `${f.enabled ? '✅ Включен' : '⏸ Отключен'}: *${f.name}*`, { parse_mode: 'Markdown' });
    }
}

function markVisited(id, chatId) {
    const f = faucets.find(f => f.id === id);
    if (f) {
        f.last = Date.now();
        bot.sendMessage(chatId, `✓ Посещение отмечено: *${f.name}*\n⏰ Следующий через: ${getTimeLeft(f)}`, { parse_mode: 'Markdown' });
    }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================
function isReady(f) {
    return !f.last || (Date.now() - f.last) >= f.interval * 60 * 1000;
}

function getSecsLeft(f) {
    if (!f.last) return 0;
    const left = f.interval * 60 * 1000 - (Date.now() - f.last);
    return Math.max(0, Math.floor(left / 1000));
}

function getTimeLeft(f) {
    const secs = getSecsLeft(f);
    if (secs <= 0) return 'сейчас';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
}


// ============================================================
// 🔍 ПОИСК ПОТЕРЯННЫХ МОНЕТ
// ============================================================

// Адреса пользователя для проверки (добавляйте сюда

async function findLostCoins(chatId) {
    bot.sendMessage(chatId, '🔍 *ПОИСК ОСТАТКОВ МОНЕТ*\n\n⏳ Анализирую все источники...', { parse_mode: 'Markdown' });

    let report = '🔍 *ОТЧЁТ: ПОТЕРЯННЫЕ / НЕУЧТЁННЫЕ МОНЕТЫ*\n\n';
    let totalFound = 0;
    let found = false;

    // 1. Краны с балансом выше минимума вывода
    report += '━━━ 🚰 *ОСТАТКИ НА КРАНАХ* ━━━\n\n';
    let faucetTotal = { BTC:0, ETH:0, LTC:0, SOL:0 };
    let withdrawReady = [];

    faucets.forEach(f => {
        if ((f.bal || 0) > 0) {
            faucetTotal[f.crypto] = (faucetTotal[f.crypto] || 0) + (f.bal || 0);
            const usd = (f.bal || 0) * (PRICES[f.crypto] || 0);
            report += `• *${f.name}*: ${(f.bal||0).toFixed(6)} ${f.crypto} (~$${usd.toFixed(4)})
`;
            if (usd >= 0.5) withdrawReady.push(f);
            found = true;
        }
    });

    if (!found) report += '_Нет записанных балансов. Обновите через приложение._\n';

    // Суммы по кранам
    let faucetUSD = 0;
    report += '\n📊 Суммарно на кранах:\n';
    for (const [cr, amt] of Object.entries(faucetTotal)) {
        if (amt > 0) {
            const usd = amt * (PRICES[cr] || 0);
            faucetUSD += usd;
            report += `  ${cr}: ${amt.toFixed(8)} ≈ $${usd.toFixed(4)}
`;
        }
    }
    totalFound += faucetUSD;

    // 2. FaucetPay балансы
    report += '\n━━━ 💳 *FAUCETPAY ОСТАТКИ* ━━━\n\n';
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        const currencies = ['BTC','ETH','LTC','SOL'];
        let fpTotal = 0;
        for (const cr of currencies) {
            try {
                const r = await fetch('https://faucetpay.io/api/v1/balance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}` });
                const d = await r.json();
                if (d.status === 200 && parseFloat(d.balance) > 0) {
                    const bal = parseFloat(d.balance);
                    const usd = bal * (PRICES[cr] || 0);
                    fpTotal += usd;
                    totalFound += usd;
                    report += `• ${cr}: ${bal.toFixed(8)} ≈ $${usd.toFixed(4)}
`;
                    if (usd >= 1.0) {
                        report += `  ⚠️ _Рекомендуется вывести!_
`;
                    }
                }
            } catch(e) {}
        }
        if (fpTotal === 0) report += '_Баланс FaucetPay пуст или не обновлён_\n';
    } else {
        report += '_FaucetPay не подключен. Добавьте API ключ._\n';
    }

    // 3. Проверка блокчейн адресов
    report += '\n━━━ ⛓ *БЛОКЧЕЙН АДРЕСА* ━━━\n\n';
    let blockchainFound = false;
    for (const [cr, addrs] of Object.entries(userAddresses)) {
        for (const addr of addrs) {
            const bal = await getBlockchainBalance(cr, addr);
            if (bal !== null && bal > 0) {
                const usd = bal * (PRICES[cr] || 0);
                totalFound += usd;
                blockchainFound = true;
                report += `• ${cr} [${addr.slice(0,12)}...]: ${bal.toFixed(8)} ≈ $${usd.toFixed(4)}
`;
            }
        }
    }
    if (!blockchainFound) {
        report += '_Добавьте адреса командой /addaddr для проверки_\n';
    }

    // 4. Итог
    report += `
━━━━━━━━━━━━━━━━━
`;
    report += `💰 *ИТОГО НАЙДЕНО: ~$${totalFound.toFixed(4)}*
`;
    report += `💴 *≈ ${(totalFound * 100).toFixed(2)} ₽*

`;

    if (withdrawReady.length > 0) {
        report += `⚡ *Готовы к выводу (${withdrawReady.length}):*
`;
        withdrawReady.forEach(f => {
            report += `  → ${f.name}: ${(f.bal||0).toFixed(6)} ${f.crypto}
`;
        });
    }

    report += `
📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, report, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '💼 Консолидировать', callback_data: 'consolidate' }],
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
                [{ text: '🔄 Обновить поиск', callback_data: 'find_coins' }],
            ]
        }
    });
}

// ============================================================
// 💼 КОНСОЛИДАЦИЯ СРЕДСТВ
// ============================================================

async function consolidateReport(chatId) {
    bot.sendMessage(chatId, '💼 *КОНСОЛИДАЦИЯ СРЕДСТВ*\n\n⏳ Анализирую...', { parse_mode: 'Markdown' });

    // Сбор всех данных
    const groups = { BTC:[], ETH:[], LTC:[], SOL:[] };
    faucets.forEach(f => {
        if (f.bal > 0) groups[f.crypto]?.push(f);
    });

    // FaucetPay балансы
    const fpBal = {};
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        for (const cr of ['BTC','ETH','LTC','SOL']) {
            try {
                const r = await fetch('https://faucetpay.io/api/v1/balance', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `api_key=${CONFIG.FP_API_KEY}&currency=${cr}` });
                const d = await r.json();
                if (d.status === 200) fpBal[cr] = parseFloat(d.balance) || 0;
            } catch(e) { fpBal[cr] = 0; }
        }
    }

    let report = '💼 *ПЛАН КОНСОЛИДАЦИИ*\n\n';

    // Комиссии сети (примерные)
    const FEES = { BTC: 0.00003, ETH: 0.001, LTC: 0.001, SOL: 0.000005 };
    const MIN_WORTH_CONSOLIDATE = { BTC: 0.0001, ETH: 0.005, LTC: 0.01, SOL: 0.05 };

    let totalConsolidated = 0;

    for (const [cr, list] of Object.entries(groups)) {
        if (list.length === 0 && !fpBal[cr]) continue;

        const faucetSum = list.reduce((a,f) => a + (f.bal||0), 0);
        const fpSum = fpBal[cr] || 0;
        const total = faucetSum + fpSum;
        const totalUSD = total * (PRICES[cr] || 0);
        const feeUSD = FEES[cr] * (PRICES[cr] || 0);

        report += `━━━ *${cr}* ━━━
`;
        report += `📦 На кранах: ${faucetSum.toFixed(8)}
`;
        report += `💳 FaucetPay: ${fpSum.toFixed(8)}
`;
        report += `📊 Итого: *${total.toFixed(8)}* (~$${totalUSD.toFixed(4)})
`;
        report += `⛽ Комиссия сети: ~$${feeUSD.toFixed(4)}
`;

        if (total >= MIN_WORTH_CONSOLIDATE[cr]) {
            const profit = totalUSD - feeUSD;
            report += `✅ *ВЫГОДНО ВЫВЕСТИ!* Профит: ~$${profit.toFixed(4)}
`;
            totalConsolidated += profit;
        } else {
            const needed = MIN_WORTH_CONSOLIDATE[cr] - total;
            report += `⏳ Ещё нужно: ${needed.toFixed(8)} ${cr}
`;
        }
        report += '\n';
    }

    report += `━━━━━━━━━━━━━━━━━
`;
    report += `💵 *Доступно для вывода: ~$${totalConsolidated.toFixed(4)}*
`;
    report += `💴 *≈ ${(totalConsolidated*100).toFixed(2)} ₽*

`;

    report += `📋 *ПОШАГОВЫЙ ПЛАН ВЫВОДА:*

`;
    report += `*1.* Соберите всё на FaucetPay
`;
    report += `   (используйте один адрес на всех кранах)

`;
    report += `*2.* В FaucetPay → Withdraw
`;
    report += `   Выводите только когда сумма > $1

`;
    report += `*3.* Укажите ваш основной кошелёк
`;
    report += `   (BTC/ETH/LTC/SOL адрес из приложения)

`;
    report += `*4.* Подождите 10-30 минут
`;
    report += `   Транзакция подтвердится в блокчейне

`;

    report += `📅 ${new Date().toLocaleString('ru')}`;

    bot.sendMessage(chatId, report, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🔍 Найти остатки', callback_data: 'find_coins' }],
                [{ text: '💳 Баланс FaucetPay', callback_data: 'fp_balance' }],
                [{ text: '🔄 Обновить', callback_data: 'consolidate' }],
            ]
        }
    });
}

// ============================================================
// ⛓ ПРОВЕРКА БЛОКЧЕЙН АДРЕСОВ (без приватных ключей!)
// ============================================================

async function getBlockchainBalance(crypto, address) {
    try {
        if (crypto === 'BTC') {
            const r = await fetch(`https://blockchain.info/balance?active=${address}`);
            const d = await r.json();
            return d[address] ? d[address].final_balance / 1e8 : 0;
        }
        if (crypto === 'ETH') {
            const r = await fetch(`https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`);
            const d = await r.json();
            return d.result ? parseInt(d.result) / 1e18 : 0;
        }
        if (crypto === 'LTC') {
            const r = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
            const d = await r.json();
            return d.balance ? d.balance / 1e8 : 0;
        }
        if (crypto === 'SOL') {
            const r = await fetch(`https://api.mainnet-beta.solana.com`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc:'2.0', id:1, method:'getBalance', params:[address] })
            });
            const d = await r.json();
            return d.result ? d.result.value / 1e9 : 0;
        }
    } catch(e) { return null; }
    return null;
}

async function checkAddress(chatId, address) {
    bot.sendMessage(chatId, `⛓ Проверяю адрес: \`${address.slice(0,20)}...\``, { parse_mode: 'Markdown' });

    // Определяем тип адреса автоматически
    let crypto = null;
    if (address.startsWith('bc1') || address.startsWith('1') || address.startsWith('3')) crypto = 'BTC';
    else if (address.startsWith('0x') && address.length === 42) crypto = 'ETH';
    else if (address.startsWith('ltc1') || address.startsWith('L') || address.startsWith('M')) crypto = 'LTC';
    else if (address.length >= 32 && address.length <= 44) crypto = 'SOL';

    if (!crypto) {
        return bot.sendMessage(chatId, '❌ Не удалось определить тип адреса.\n\nПоддерживаются: BTC, ETH, LTC, SOL', { parse_mode: 'Markdown' });
    }

    const bal = await getBlockchainBalance(crypto, address);

    if (bal === null) {
        return bot.sendMessage(chatId, `⚠️ Ошибка запроса к блокчейну для ${crypto}.
Попробуйте позже.`);
    }

    const usd = bal * (PRICES[crypto] || 0);
    const rub = usd * 100;
    const status = bal > 0 ? '✅ Есть средства!' : '🔘 Баланс нулевой';

    const text = `⛓ *РЕЗУЛЬТАТ ПРОВЕРКИ АДРЕСА*

${status}

📍 Адрес: \`${address.slice(0,20)}...\`
🔑 Тип: *${crypto}*
💰 Баланс: *${bal.toFixed(8)} ${crypto}*
💵 ≈ $${usd.toFixed(4)}
💴 ≈ ${rub.toFixed(2)} ₽

📅 ${new Date().toLocaleTimeString('ru')}`;

    const explorerUrls = {
        BTC: `https://blockchain.com/explorer/addresses/BTC/${address}`,
        ETH: `https://etherscan.io/address/${address}`,
        LTC: `https://blockchair.com/litecoin/address/${address}`,
        SOL: `https://solscan.io/account/${address}`,
    };

    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🌐 Посмотреть в блокчейне', url: explorerUrls[crypto] }],
                [{ text: '🔍 Найти другие остатки', callback_data: 'find_coins' }],
            ]
        }
    });
}

// Добавить адрес для отслеживания
bot.onText(/\/addaddr (.+)/, (msg, match) => {
    const addr = match[1].trim();
    let crypto = null;
    if (addr.startsWith('bc1') || addr.startsWith('1') || addr.startsWith('3')) crypto = 'BTC';
    else if (addr.startsWith('0x') && addr.length === 42) crypto = 'ETH';
    else if (addr.startsWith('ltc1') || addr.startsWith('L') || addr.startsWith('M')) crypto = 'LTC';
    else if (addr.length >= 32 && addr.length <= 44) crypto = 'SOL';

    if (!crypto) {
        bot.sendMessage(msg.chat.id, '❌ Неизвестный формат адреса');
        return;
    }

    if (!userAddresses[crypto].includes(addr)) {
        userAddresses[crypto].push(addr);
        bot.sendMessage(msg.chat.id, 
            `✅ *Адрес добавлен для мониторинга*

🔑 ${crypto}: \`${addr.slice(0,20)}...\`

Теперь /find будет проверять этот адрес`, 
            { parse_mode: 'Markdown' }
        );
    } else {
        bot.sendMessage(msg.chat.id, '⚠️ Этот адрес уже добавлен');
    }
});

// Список отслеживаемых адресов
bot.onText(/\/myaddrs/, (msg) => {
    let text = '📋 *МОИ ОТСЛЕЖИВАЕМЫЕ АДРЕСА*\n\n';
    let hasAddrs = false;
    for (const [cr, addrs] of Object.entries(userAddresses)) {
        if (addrs.length > 0) {
            hasAddrs = true;
            text += `*${cr}:*
`;
            addrs.forEach((a, i) => {
                text += `  ${i+1}. \`${a.slice(0,20)}...\`
`;
            });
            text += '\n';
        }
    }
    if (!hasAddrs) text += '_Нет добавленных адресов_\n\nДобавьте: /addaddr [адрес]';
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});


// ============================================================
// 🔍 ПОИСК НОВЫХ КРАНОВ
// ============================================================
