require('dotenv/config');
const { Client, IntentsBitField } = require('discord.js');
const { Configuration, OpenAIApi } = require('openai');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent
  ]
});

client.on('ready', () => {
  console.log('Bot is ready!');
});

// Create an OpenAI API configuration
const configuration = new Configuration({
  apiKey: process.env.API_KEY
});

// Create an OpenAI API client
const openai = new OpenAIApi(configuration);

client.on('messageCreate', async (message) => {
  // Check if the message is from a bot
  if (message.author.bot) return;
  // Check if the message is from the right channel
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  // Check if the user wants to end the conversation
  if (message.content === '!end') {
    return message.reply('Bye!');
  }
  // Check if the user wants to delete the conversation
  if (message.content === '!delete') {
    try {
      // Delete all the messages from the user
      let messages = await message.channel.messages.fetch();
      const userMessages = messages.filter(
        (msg) => msg.author.id === message.author.id
      );
      const botMessages = messages.filter(
        (msg) => msg.author.id === client.user.id
      );
      await message.channel.bulkDelete(userMessages);
      await message.channel.bulkDelete(botMessages);
      return;
    } catch (error) {
      console.error(error.message);
      return message.reply('Something went wrong!');
    }
  }

  let conversationLog = [{ role: 'system', content: 'Nice to meet you!' }];

  try {
    await message.channel.sendTyping();

    // Fetch all messages
    let preMessages = await message.channel.messages.fetch();
    preMessages.reverse();

    // Add the messages to the conversation log
    preMessages.forEach((msg) => {
      if (message.content.startsWith('!')) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: 'user',
        content: msg.content
      });
    });

    // Create a prompt
    const prompt = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: conversationLog
    });

    // Send the bot's response
    const botMessage = await message.reply(prompt.data.choices[0].message);

    // Make the bot's message in the channel visible only to the user who sent the message
    await botMessage.channel.permissionOverwrites.edit(message.author, {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      READ_MESSAGE_HISTORY: true
    });

    // Make the bot's message in the channel visible only to the bot
    await botMessage.channel.permissionOverwrites.edit(client.user, {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      READ_MESSAGE_HISTORY: true
    });

    // Make the bot's message in the channel visible only to the user who sent the message
    await message.channel.permissionOverwrites.edit(message.author, {
      VIEW_CHANNEL: true,
      SEND_MESSAGES: true,
      READ_MESSAGE_HISTORY: true
    });
  } catch (error) {
    console.error(error.message);
    return message.reply('Something went wrong!');
  }
});

client.login(process.env.TOKEN);

const express = require('express');

const server = express();

server.all('/', (req, res) => {
  res.send('Bot is running!');
});

const PORT = process.env.PORT || 5000;

function keepAlive() {
  server.listen(PORT, () => {
    console.log('Server is ready!');
  });
}

keepAlive();
