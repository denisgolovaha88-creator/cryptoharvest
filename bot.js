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
    const text = `⚡ *CryptoHarvest v4.0*\n\nПривет, *${name}*! 👋\n\nЯ помогу тебе управлять крипто кранами:\n• Получать уведомления о готовых кранах\n• Проверять баланс на FaucetPay\n• Следить за таймерами\n• Отслеживать доходы\n\n_Используйте кнопки меню ниже:_`;
    bot.sendMessage(msg.chat.id, text, {
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
            one_time_keyboard: false,
            persistent: true,
        }
    });
});

// /help — справка
bot.onText(/\/help/, (msg) => sendHelp(msg.chat.id));

// /status — статус автосбора
bot.onText(/\/status/, (msg) => sendStatus(msg.chat.id));

// /balance — балансы
bot.onText(/\/balance/, (msg) => sendBalances(msg.chat.id));

// /faucets — список кранов
bot.onText(/\/faucets/, (msg) => sendFaucetsList(msg.chat.id));

// /ready — готовые краны
bot.onText(/\/ready/, (msg) => sendReadyFaucets(msg.chat.id));

// /fp — FaucetPay баланс
bot.onText(/\/fp/, (msg) => sendFaucetPayBalance(msg.chat.id));

// /auto — переключить автосбор
bot.onText(/\/auto/, (msg) => toggleAutoCollect(msg.chat.id));

// /find — поиск остатков монет
bot.onText(/\/find/, (msg) => findLostCoins(msg.chat.id));

// /consolidate — отчёт для консолидации
bot.onText(/\/consolidate/, (msg) => consolidateReport(msg.chat.id));

// /checkaddr — проверить баланс адреса
bot.onText(/\/checkaddr (.+)/, (msg, match) => {
    const addr = match[1].trim();
    checkAddress(msg.chat.id, addr);
});

// ============================================================
// КНОПКИ МЕНЮ
// ============================================================
bot.on('message', (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;

    if (text === '📊 Статус')         sendStatus(chatId);
    else if (text === '💰 Мои кошельки')  sendWallets(chatId);
    else if (text === '🚰 Найти краны')   sendFaucetsList(chatId);
    else if (text === '⚙️ Автосбор')      sendAutoMenu(chatId);
    else if (text === '💳 FaucetPay')     sendFaucetPayBalance(chatId);
    else if (text === '📈 Балансы')       sendBalances(chatId);
    else if (text === '⏰ Таймеры')       sendTimers(chatId);
    else if (text === '🔍 Поиск монет')   findLostCoins(chatId);
    else if (text === '💼 Консолидация')  consolidateReport(chatId);
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
/checkaddr [адрес] → Проверить адрес\n\n*Кнопки меню:*\n💰 Мои кошельки → Ваши адреса\n📊 Статус → Статистика\n🚰 Найти краны → Список кранов\n⚙️ Автосбор → Управление\n💳 FaucetPay → Баланс FP\n📈 Балансы → Доходы\n⏰ Таймеры → Когда следующий\nℹ️ Справка → Эта страница\n\n_CryptoHarvest v4.0 • BTC+ETH+LTC+SOL_`;
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
            const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
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
    const text = `⚙️ *АВТОСБОР*\n\nСтатус: ${autoCollect ? '🟢 *Работает*' : '🔴 *Остановлен*'}\n\nАвтосбор проверяет готовые краны каждые 5 минут и отправляет вам уведомление.\n\n_Для посещения крана нажмите кнопку из уведомления_`;
    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '▶️ Включить', callback_data: 'auto_on' },
                    { text: '⏹ Выключить', callback_data: 'auto_off' },
                ],
                [{ text: '📊 Статус', callback_data: 'status' }],
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

// Адреса пользователя для проверки (добавляйте сюда)
let userAddresses = {
    BTC: [],  // ['bc1q...', '1ABC...']
    ETH: [],  // ['0x123...']
    LTC: [],  // ['ltc1q...']
    SOL: [],  // ['ABC123...']
};

async function findLostCoins(chatId) {
    bot.sendMessage(chatId, '🔍 *ПОИСК ОСТАТКОВ МОНЕТ*

⏳ Анализирую все источники...', { parse_mode: 'Markdown' });

    let report = '🔍 *ОТЧЁТ: ПОТЕРЯННЫЕ / НЕУЧТЁННЫЕ МОНЕТЫ*

';
    let totalFound = 0;
    let found = false;

    // 1. Краны с балансом выше минимума вывода
    report += '━━━ 🚰 *ОСТАТКИ НА КРАНАХ* ━━━

';
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

    if (!found) report += '_Нет записанных балансов. Обновите через приложение._
';

    // Суммы по кранам
    let faucetUSD = 0;
    report += '
📊 Суммарно на кранах:
';
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
    report += '
━━━ 💳 *FAUCETPAY ОСТАТКИ* ━━━

';
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        const currencies = ['BTC','ETH','LTC','SOL'];
        let fpTotal = 0;
        for (const cr of currencies) {
            try {
                const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
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
        if (fpTotal === 0) report += '_Баланс FaucetPay пуст или не обновлён_
';
    } else {
        report += '_FaucetPay не подключен. Добавьте API ключ._
';
    }

    // 3. Проверка блокчейн адресов
    report += '
━━━ ⛓ *БЛОКЧЕЙН АДРЕСА* ━━━

';
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
        report += '_Добавьте адреса командой /addaddr для проверки_
';
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
    bot.sendMessage(chatId, '💼 *КОНСОЛИДАЦИЯ СРЕДСТВ*

⏳ Анализирую...', { parse_mode: 'Markdown' });

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
                const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
                const d = await r.json();
                if (d.status === 200) fpBal[cr] = parseFloat(d.balance) || 0;
            } catch(e) { fpBal[cr] = 0; }
        }
    }

    let report = '💼 *ПЛАН КОНСОЛИДАЦИИ*

';

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
        report += '
';
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
        return bot.sendMessage(chatId, '❌ Не удалось определить тип адреса.

Поддерживаются: BTC, ETH, LTC, SOL', { parse_mode: 'Markdown' });
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
    let text = '📋 *МОИ ОТСЛЕЖИВАЕМЫЕ АДРЕСА*

';
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
            text += '
';
        }
    }
    if (!hasAddrs) text += '_Нет добавленных адресов_

Добавьте: /addaddr [адрес]';
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

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
`);bot.sendMessage(CONFIG.CHAT_ID,
            `⚡ *CryptoHarvest Bot запущен!*\n\n✅ BTC + ETH + LTC + SOL\n🚰 Кранов: ${faucets.length}\n🤖 Готов к работе\n\n📅 ${new Date().toLocaleString('ru')}`,
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
        );;
});

// /help — справка
bot.onText(/\/help/, (msg) => sendHelp(msg.chat.id));

// /status — статус автосбора
bot.onText(/\/status/, (msg) => sendStatus(msg.chat.id));

// /balance — балансы
bot.onText(/\/balance/, (msg) => sendBalances(msg.chat.id));

// /faucets — список кранов
bot.onText(/\/faucets/, (msg) => sendFaucetsList(msg.chat.id));

// /ready — готовые краны
bot.onText(/\/ready/, (msg) => sendReadyFaucets(msg.chat.id));

// /fp — FaucetPay баланс
bot.onText(/\/fp/, (msg) => sendFaucetPayBalance(msg.chat.id));

// /auto — переключить автосбор
bot.onText(/\/auto/, (msg) => toggleAutoCollect(msg.chat.id));

// /find — поиск остатков монет
bot.onText(/\/find/, (msg) => findLostCoins(msg.chat.id));

// /consolidate — отчёт для консолидации
bot.onText(/\/consolidate/, (msg) => consolidateReport(msg.chat.id));

// /checkaddr — проверить баланс адреса
bot.onText(/\/checkaddr (.+)/, (msg, match) => {
    const addr = match[1].trim();
    checkAddress(msg.chat.id, addr);
});

// ============================================================
// КНОПКИ МЕНЮ
// ============================================================
bot.on('message', (msg) => {
    const text = msg.text;
    const chatId = msg.chat.id;

    if (text === '📊 Статус')         sendStatus(chatId);
    else if (text === '💰 Мои кошельки')  sendWallets(chatId);
    else if (text === '🚰 Найти краны')   sendFaucetsList(chatId);
    else if (text === '⚙️ Автосбор')      sendAutoMenu(chatId);
    else if (text === '💳 FaucetPay')     sendFaucetPayBalance(chatId);
    else if (text === '📈 Балансы')       sendBalances(chatId);
    else if (text === '⏰ Таймеры')       sendTimers(chatId);
    else if (text === '🔍 Поиск монет')   findLostCoins(chatId);
    else if (text === '💼 Консолидация')  consolidateReport(chatId);
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
/checkaddr [адрес] → Проверить адрес\n\n*Кнопки меню:*\n💰 Мои кошельки → Ваши адреса\n📊 Статус → Статистика\n🚰 Найти краны → Список кранов\n⚙️ Автосбор → Управление\n💳 FaucetPay → Баланс FP\n📈 Балансы → Доходы\n⏰ Таймеры → Когда следующий\nℹ️ Справка → Эта страница\n\n_CryptoHarvest v4.0 • BTC+ETH+LTC+SOL_`;
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
            const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
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
    const text = `⚙️ *АВТОСБОР*\n\nСтатус: ${autoCollect ? '🟢 *Работает*' : '🔴 *Остановлен*'}\n\nАвтосбор проверяет готовые краны каждые 5 минут и отправляет вам уведомление.\n\n_Для посещения крана нажмите кнопку из уведомления_`;
    bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '▶️ Включить', callback_data: 'auto_on' },
                    { text: '⏹ Выключить', callback_data: 'auto_off' },
                ],
                [{ text: '📊 Статус', callback_data: 'status' }],
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

// Адреса пользователя для проверки (добавляйте сюда)
let userAddresses = {
    BTC: [],  // ['bc1q...', '1ABC...']
    ETH: [],  // ['0x123...']
    LTC: [],  // ['ltc1q...']
    SOL: [],  // ['ABC123...']
};

async function findLostCoins(chatId) {
    bot.sendMessage(chatId, '🔍 *ПОИСК ОСТАТКОВ МОНЕТ*

⏳ Анализирую все источники...', { parse_mode: 'Markdown' });

    let report = '🔍 *ОТЧЁТ: ПОТЕРЯННЫЕ / НЕУЧТЁННЫЕ МОНЕТЫ*

';
    let totalFound = 0;
    let found = false;

    // 1. Краны с балансом выше минимума вывода
    report += '━━━ 🚰 *ОСТАТКИ НА КРАНАХ* ━━━

';
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

    if (!found) report += '_Нет записанных балансов. Обновите через приложение._
';

    // Суммы по кранам
    let faucetUSD = 0;
    report += '
📊 Суммарно на кранах:
';
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
    report += '
━━━ 💳 *FAUCETPAY ОСТАТКИ* ━━━

';
    if (CONFIG.FP_API_KEY && CONFIG.FP_API_KEY !== 'ВАШ_FAUCETPAY_API_KEY') {
        const currencies = ['BTC','ETH','LTC','SOL'];
        let fpTotal = 0;
        for (const cr of currencies) {
            try {
                const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
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
        if (fpTotal === 0) report += '_Баланс FaucetPay пуст или не обновлён_
';
    } else {
        report += '_FaucetPay не подключен. Добавьте API ключ._
';
    }

    // 3. Проверка блокчейн адресов
    report += '
━━━ ⛓ *БЛОКЧЕЙН АДРЕСА* ━━━

';
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
        report += '_Добавьте адреса командой /addaddr для проверки_
';
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
    bot.sendMessage(chatId, '💼 *КОНСОЛИДАЦИЯ СРЕДСТВ*

⏳ Анализирую...', { parse_mode: 'Markdown' });

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
                const r = await fetch(`https://faucetpay.io/api/v1/balance?api_key=${CONFIG.FP_API_KEY}&currency=${cr}`);
                const d = await r.json();
                if (d.status === 200) fpBal[cr] = parseFloat(d.balance) || 0;
            } catch(e) { fpBal[cr] = 0; }
        }
    }

    let report = '💼 *ПЛАН КОНСОЛИДАЦИИ*

';

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
        report += '
';
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
        return bot.sendMessage(chatId, '❌ Не удалось определить тип адреса.

Поддерживаются: BTC, ETH, LTC, SOL', { parse_mode: 'Markdown' });
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
    let text = '📋 *МОИ ОТСЛЕЖИВАЕМЫЕ АДРЕСА*

';
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
            text += '
';
        }
    }
    if (!hasAddrs) text += '_Нет добавленных адресов_

Добавьте: /addaddr [адрес]';
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
});

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
