require("dotenv/config");
const { Client, IntentsBitField } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on("ready", () => {
  console.log("Bot is ready!");
});

// Create an OpenAI API configuration
const configuration = new Configuration({
  apiKey: process.env.API_KEY,
});

// Create an OpenAI API client
const openai = new OpenAIApi(configuration);

client.on("messageCreate", async (message) => {
  // Check if the message is from a bot
  if (message.author.bot) return;
  // Check if the message is from the right channel
  if (message.channel.id !== process.env.CHANNEL_ID) return;
  // Check if the user wants to end the conversation
  if (message.content === "!end") {
    // Delete all the messages from the user
    const messages = await message.channel.messages.fetch();
    const userMessages = messages.filter(
      (msg) => msg.author.id === message.author.id
    );
    const botMessages = messages.filter(
      (msg) => msg.author.id === client.user.id
    );
    await message.channel.bulkDelete([...userMessages, ...botMessages]);
    return;
  }

  let conversationLog = [{ role: "system", content: "Nice to meet you!" }];

  try {
    await message.channel.sendTyping();

    // Fetch the last 15 messages
    let preMessages = await message.channel.messages.fetch();
    preMessages.reverse();

    // Add the messages to the conversation log
    preMessages.forEach((msg) => {
      if (message.content.startsWith("!")) return;
      if (msg.author.id !== client.user.id && message.author.bot) return;
      if (msg.author.id !== message.author.id) return;

      conversationLog.push({
        role: "user",
        content: msg.content,
      });
    });

    // Create a prompt
    const prompt = await openai
      .createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: conversationLog,
      })
      .catch((error) => {
        console.error(error);
        return message.reply("Something went wrong!");
      });

    // Send the bot's response
    const botMessage = await message.channel.send(
      prompt.data.choices[0].message
    );

    // Send the bot's response to the user
    message.author.send(prompt.data.choices[0].message);

    // Make the bot's message in the channel visible only to the user who initiated the conversation
    const user = message.author;
    const everyoneRole = message.guild.roles.everyone;
    const permissionsOverwrite = [
      {
        id: user.id,
        allow: ["VIEW_CHANNEL"],
      },
      {
        id: everyoneRole.id,
        deny: ["VIEW_CHANNEL"],
      },
    ];
    await botMessage.edit({ permissionOverwrites: permissionsOverwrite });
  } catch (error) {
    console.error(error);
    return message.reply("Something went wrong!");
  }
});

client.login(process.env.TOKEN);
