const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('Hello Express app!')
});

app.listen(3000, () => {
  console.log('server started');
});
const Keyv = require('keyv')
const prefixes = new Keyv('sqlite://storage/prefixes.sqlite')
const levels = new Keyv('sqlite://storage/levels.sqlite')
const icons = new Keyv('sqlite://storage/icons.sqlite')
const {globalPrefix} = require('./jsStorage/config.json')
const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const {MessageEmbed} = require("discord.js")
const Discord = require('discord.js')
const client = new Discord.Client({
  partials: ['MESSAGE', `USER`, `REACTION`],
  presence: {
    status: 'idle',
    activity: {
      name: `for ${globalPrefix}help`,
      type: 'WATCHING'
    }
  }  
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`)
});

client.on('message', async msg => {
  if (msg.author.bot || msg.channel.type == 'dm') return;
  let args;
  let prefix;
  let command;
  if (msg.content.startsWith(globalPrefix)) {
    prefix = globalPrefix;
  } else {
    const guildPrefix = await prefixes.get(msg.guild.id);
    if (msg.content.startsWith(guildPrefix)) prefix = guildPrefix;
  }

  if (!prefix) {
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(globalPrefix)})\\s*`);
    if (!prefixRegex.test(msg.content)) return;

    const [, matchedPrefix] = msg.content.match(prefixRegex);
    args = msg.content.slice(matchedPrefix.length).trim().split(/ +/);
    command = args.shift().toLowerCase();
  }else{
    args = msg.content.slice(prefix.length).trim().split(/\s+/);
    command = args.shift().toLowerCase();
  }
  //commands
  switch(command){
    case "start":
    case "play":
      let userLevel = await levels.get(msg.author.id)
      if(!userLevel){
        userLevel = 1
      }
      let openedLevels = "*******"
      for(i=0;i<userLevel;i++){
        openedLevels = openedLevels.replace("*", "🟢")
      }
      for(i=0;openedLevels.includes("*");i++){
        openedLevels = openedLevels.replace("*", "🚫")
      }
      let chooseEmbed = new MessageEmbed()
        .setColor("BLUE")
        .setTitle("Choose a level")
        .setDescription(openedLevels)
        .addField("\u200b", "\u200b", false)
        .addField(`🟢 means that it is open, while 🚫 means the level is closed, and will unlock as you level up`, "To choose a level, type out the place that the green circle is from the start", true)
        .addField("If you don't know how to play, type `cancel` and do `" + prefix + "how-to-play`", "\u200b", false)
        .setFooter("Labyrinth")
      await msg.channel.send(chooseEmbed)
      const filter = m => m.author.id == msg.author.id
      let choosedLevel = await msg.channel.awaitMessages(filter, {time: 60000, max: 1, errors: ['time']}).catch(()=> {
        msg.channel.send("You didn't enter anything!")
      })
      try{
        choosedLevel.first().content
      }catch{
        return;
      }
      if(choosedLevel.first().content.toLowerCase() == 'cancel') return msg.channel.send("Cancelled!")
      if(isNaN(choosedLevel.first().content.toLowerCase())) return msg.channel.send("It should be a number mate")
      if(choosedLevel > 7) return msg.channel.send("For now, there's only 7 levels!")
      if(choosedLevel.first().content > userLevel) return msg.channel.send("That level is locked for you!")

      const levelInfo = require('./jsStorage/levels/level' + choosedLevel.first().content + '.json')
      let stillPlaying = true
      let currentBoardRaw = levelInfo.maps.og
      let currentPosition = {
        x: levelInfo.startPosition.x,
        y: levelInfo.startPosition.y
      }
      let endingPoint = {
        x: levelInfo.endPosition.x,
        y: levelInfo.endPosition.y
      }
			let userIcon = await icons.get(msg.author.id)
			if(!userIcon){
				userIcon = '😑'
			}
      let currentBoard = currentBoardRaw
      let message = await msg.channel.send("Starting...")
      let failedAttempsFromWASD = 0;
      currentBoard = await currentBoard.replace("S", userIcon)
      for(i=0;currentBoard.includes("*");i++){
        currentBoard = currentBoard.replace("*", "🟫")
      }
      for(i=0;currentBoard.includes("^");i++){
        currentBoard = currentBoard.replace("^", "🟥")
      }
      for(i=0;currentBoard.includes(" ");i++){
        currentBoard = currentBoard.replace(" ", "🟩")
      }
      for(i=0;currentBoard.includes("E");i++){
        currentBoard = currentBoard.replace("E", "🟦")
      }
      do{
        let moveEmbed = new MessageEmbed()
          .setTitle("Make a move!")
          .setDescription(currentBoard)
          .setColor("RED")
          .setFooter("Labyrinth")
				setTimeout(() => {
        	message.edit("Make a move!",  moveEmbed)
				}, 500)
        let move = await msg.channel.awaitMessages(filter, {time: 60000, max: 1, errors: ['time']}).catch(()=> {
          msg.channel.send("You didn't enter anything!")
        })
        try{
          move.first().content
        }catch{
          return;
        }

        if(move.first().content.toLowerCase() !== 'w' && move.first().content.toLowerCase() !== 'a' && move.first().content.toLowerCase() !== 's' && move.first().content.toLowerCase() !== 'd' && move.first().content.toLowerCase() !== 'cancel') {
          let msgss = await msg.channel.send("The commands are W A S D, try again after this message deletes")
          move.first().delete()
          setTimeout(()=> msgss.delete(), 4000)
        }else{
          switch(move.first().content.toLowerCase()){
            case "cancel":
						  msg.channel.send("Cancelled!")
							return;
							break;
						case "w":
              currentPosition.y++
              if(endingPoint.x == currentPosition.x && endingPoint.y == currentPosition.y){
                stillPlaying = false
                msg.channel.send("Congratulations, you've beaten the level! You've levelled up!")
								if(choosedLevel.first().content == userLevel){
                	userLevel+=1
									levels.set(msg.author.id, userLevel)
								}
                levels.set(msg.author.id, userLevel)
                let winEmbed = new MessageEmbed()
                  .setTitle("GG, you've won!")
                  .setColor("RED")
                  .setFooter("Labyrinth")
                message.edit("GG!", winEmbed)
                return;
              }else{

                if(levelInfo.walls.indexOf(currentPosition) !== -1){
                  move.first().delete()
									currentPosition.y--
                }else if(levelInfo.spikes.indexOf(`${currentPosition.x},${currentPosition.y}`) !== -1){
                  stillPlaying = false
                  msg.channel.send("You've died!")

                  let winEmbed = new MessageEmbed()
                    .setTitle("You've died, gg!")
                    .setColor("RED")
                    .setFooter("Labyrinth")
                  message.edit("GG!", winEmbed)
                  return;
                }else{
                  let mapCheck = levelInfo.maps[`${currentPosition.x},${currentPosition.y}`]
                  if(!mapCheck) {
                    move.first().delete()
										currentPosition.y--
                  }else{
                    currentBoard = mapCheck
                    currentBoard = await currentBoard.replace("S", userIcon)
                    for(i=0;currentBoard.includes("*");i++){
                      currentBoard = currentBoard.replace("*", "🟫")
                    }
                    for(i=0;currentBoard.includes("^");i++){
                      currentBoard = currentBoard.replace("^", "🟥")
                    }
                    for(i=0;currentBoard.includes(" ");i++){
                      currentBoard = currentBoard.replace(" ", "🟩")
                    }
                    for(i=0;currentBoard.includes("E");i++){
                      currentBoard = currentBoard.replace("E", "🟦")
                    }
                    move.first().delete()
                  }
                }
              }
              break;
            case "a":
             currentPosition.x--
              if(endingPoint.x == currentPosition.x && endingPoint.y == currentPosition.y){
                stillPlaying = false
                msg.channel.send("Congratulations, you've beaten the level! You've levelled up!")
                if(choosedLevel.first().content == userLevel){
                	userLevel+=1
									levels.set(msg.author.id, userLevel)
								}
                levels.set(msg.author.id, userLevel)
                let winEmbed = new MessageEmbed()
                  .setTitle("GG, you've won!")
                  .setColor("RED")
                  .setFooter("Labyrinth")
                message.edit("GG!", winEmbed)
                return;
              }else{
                if(levelInfo.walls.indexOf(currentPosition) !== -1){
                  move.first().delete()
									currentPosition.x++
                }else if(levelInfo.spikes.indexOf(`${currentPosition.x},${currentPosition.y}`) !== -1){
                  stillPlaying = false
                  msg.channel.send("You've died!")
                  let winEmbed = new MessageEmbed()
                    .setTitle("You've died, gg!")
                    .setColor("RED")
                    .setFooter("Labyrinth")
                  message.edit("GG!", winEmbed)
                  return;
                }else{
                  let mapCheck = levelInfo.maps[`${currentPosition.x},${currentPosition.y}`]
                  if(!mapCheck) {
                    move.first().delete()
										currentPosition.x++
                  }else{
                    currentBoard = mapCheck
                    currentBoard = await currentBoard.replace("S", userIcon)
                    for(i=0;currentBoard.includes("*");i++){
                      currentBoard = currentBoard.replace("*", "🟫")
                    }
                    for(i=0;currentBoard.includes("^");i++){
                      currentBoard = currentBoard.replace("^", "🟥")
                    }
                    for(i=0;currentBoard.includes(" ");i++){
                      currentBoard = currentBoard.replace(" ", "🟩")
                    }
                    for(i=0;currentBoard.includes("E");i++){
                      currentBoard = currentBoard.replace("E", "🟦")
                    }
                    move.first().delete()
                  }
                }
              }
              break;
            case "s":
             currentPosition.y--
              if(endingPoint.x == currentPosition.x && endingPoint.y == currentPosition.y){
                stillPlaying = false
                msg.channel.send("Congratulations, you've beaten the level! You've levelled up!")
								if(choosedLevel.first().content == userLevel){
                	userLevel+=1
									levels.set(msg.author.id, userLevel)
								}
                levels.set(msg.author.id, userLevel)
                let winEmbed = new MessageEmbed()
                  .setTitle("GG, you've won!")
                  .setColor("RED")
                  .setFooter("Labyrinth")
                message.edit("GG!", winEmbed)
                return;
              }else{
                if(levelInfo.walls.indexOf(currentPosition) !== -1){
                  move.first().delete()
									currentPosition.y++
                }else if(levelInfo.spikes.indexOf(`${currentPosition.x},${currentPosition.y}`) !== -1){
                  stillPlaying = false
                  msg.channel.send("You've died!")
                  let winEmbed = new MessageEmbed()
                    .setTitle("You've died, gg!")
                    .setColor("RED")
                    .setFooter("Labyrinth")
                  message.edit("GG!", winEmbed)
                  return;
                }else{
                  let mapCheck = levelInfo.maps[`${currentPosition.x},${currentPosition.y}`]
                  if(!mapCheck) {
                    move.first().delete()
										currentPosition.y++
                  }else{
                    currentBoard = mapCheck
                    currentBoard = await currentBoard.replace("S", userIcon)
                    for(i=0;currentBoard.includes("*");i++){
                      currentBoard = currentBoard.replace("*", "🟫")
                    }
                    for(i=0;currentBoard.includes("^");i++){
                      currentBoard = currentBoard.replace("^", "🟥")
                    }
                    for(i=0;currentBoard.includes(" ");i++){
                      currentBoard = currentBoard.replace(" ", "🟩")
                    }
                    for(i=0;currentBoard.includes("E");i++){
                      currentBoard = currentBoard.replace("E", "🟦")
                    }
                    move.first().delete()
                  }
                }
              }
              break;
            case "d":
             currentPosition.x++
              if(endingPoint.x == currentPosition.x && endingPoint.y == currentPosition.y){
                stillPlaying = false
                msg.channel.send("Congratulations, you've beaten the level! You've levelled up!")
								if(choosedLevel.first().content == userLevel){
                	userLevel+=1
									levels.set(msg.author.id, userLevel)
								}
                let winEmbed = new MessageEmbed()
                  .setTitle("GG, you've won!")
                  .setColor("RED")
                  .setFooter("Labyrinth")
                message.edit("GG!", winEmbed)
                return;
              }else{
                if(levelInfo.walls.indexOf(currentPosition) !== -1){
                  move.first().delete()
									currentPosition.x--
                }else if(levelInfo.spikes.indexOf(`${currentPosition.x},${currentPosition.y}`) !== -1){
                  stillPlaying = false
                  msg.channel.send("You've died!")
                  let winEmbed = new MessageEmbed()
                    .setTitle("You've died, gg!")
                    .setColor("RED")
                    .setFooter("Labyrinth")
                  message.edit("GG!", winEmbed)
                  return;
                }else{
                  let mapCheck = levelInfo.maps[`${currentPosition.x},${currentPosition.y}`]
                  if(!mapCheck) {
                    move.first().delete()
										currentPosition.x--
                  }else{
                    currentBoard = mapCheck
                    currentBoard = await currentBoard.replace("S", userIcon)
                    for(i=0;currentBoard.includes("*");i++){
                      currentBoard = currentBoard.replace("*", "🟫")
                    }
                    for(i=0;currentBoard.includes("^");i++){
                      currentBoard = currentBoard.replace("^", "🟥")
                    }
                    for(i=0;currentBoard.includes(" ");i++){
                      currentBoard = currentBoard.replace(" ", "🟩")
                    }
                    for(i=0;currentBoard.includes("E");i++){
                      currentBoard = currentBoard.replace("E", "🟦")
                    }
                    move.first().delete()
                  }
                }
              }
              break;
          }
        }
      }while(stillPlaying == true)

      break;
			break;
    case "ping":
      let pingMessage = await msg.reply('Pinging...');
      await pingMessage.edit(`Ping! ${Date.now() - msg.createdTimestamp}ms.`)
    break;
		case "how-to-play":
		case "guide":
			let userIcon1 = await icons.get(msg.author.id)
			if(!userIcon1){
				userIcon1 = "😑"
			}
			let howToPlayEmbed = new MessageEmbed()
				.setColor("RANDOM")
				.setTitle("How to play Labyrinth")
				.setDescription("So, you've stumbled apon this bot, Labyrinth, and decided it looks fun")
				.addField(userIcon1, "This is you, you control this emoji with W, A, S, D. You can customize this with `" + prefix + "icon`", true)
				.addField("🟫", "These are blocks, you cannot walk into them, if you try, it will just delete your message and prompt you to try again", true)
				.addField("🟩", "These are all possible routes, you can walk in these", true)
				.addField("🟥", "These are death traps, if you walk into them, you will die", true)
				.addField("🟦", "This is your destanation, try to get to here", true)
				.addField("🔵", "Fake destination, this will kill you", true)
				.addField("🔴", "Fake spike, will not kill you if you walk through it")
				.addField("🟢", "Fake path, will kill you if you walk through it")
				.addField("Other", "You can type `cancel` at any time to cancel your game, and you will level up as you finish levels")
				.setFooter("Labyrinth")
			msg.channel.send(howToPlayEmbed)
			break;
    case "help":
      const commands = require('./jsStorage/help');
      let embed =  new MessageEmbed()
        .setTitle('HELP MENU')
        .setColor('RANDOM')
        .setFooter(`Labyrinth`)
      if (!args[0])
        embed
          .setDescription(Object.keys(commands).map(command => `\`${command.padEnd(Object.keys(commands).reduce((a, b) => b.length > a.length ? b : a, '').length)}\` - ${commands[command].description}`).join('\n'));
      else {
        if (Object.keys(commands).includes(args[0].toLowerCase()) || Object.keys(commands).map(c => commands[c].aliases || []).flat().includes(args[0].toLowerCase())) {
          let command = Object.keys(commands).includes(args[0].toLowerCase())? args[0].toLowerCase() : Object.keys(commands).find(c => commands[c].aliases && commands[c].aliases.includes(args[0].toLowerCase()));
          embed
            .setTitle(`COMMAND - ${command}`)

          if (commands[command].aliases)
            embed.addField('Command aliases', `\`${commands[command].aliases.join('`, `')}\``);
          embed
            .addField('DESCRIPTION', commands[command].description)
            .addField('FORMAT', `\`\`\`${prefix}${commands[command].format}\`\`\``);
        } else {
          embed
            .setColor('RED')
            .setDescription('This command does not exist. Please use the help command without specifying any commands to list them all.');
        }
      }
      msg.channel.send(embed);
    break;
    case "invite":
      let inviteEmbed = new MessageEmbed()
        .setColor("RANDOM")
        .setTitle("Invites!")
        .setDescription("Invite me to your server with [this invite!](https://discord.com/oauth2/authorize?client_id=" + client.user.id + "&permissions=321600&scope=bot)")
        .setFooter("Labyrinth")
      msg.channel.send(inviteEmbed)
    break;
    case "prefix":
      if (args.length){
        if (!msg.member.permissions.has("MANAGE_SERVER")) return msg.channel.send("You need manage server perms to change the prefix!")
        if (args[1]) return msg.channel.send("You can't have a prefix with a space in it, sorry!")
        if (args[0].size >= 6) return msg.channel.send("The prefix can't be bigger than five, sorry!")
        prefixes.set(msg.guild.id, args[0])
        msg.channel.send(`Set the guild prefix to **${args[0]}**`)
      }else{
        let prefixEmbed = new MessageEmbed()
          .setColor("RANDOM")
          .setTitle("Prefixes!")
          .addField("Prefix", `Prefix is \`${await prefixes.get(msg.guild.id) || globalPrefix}\``, false)
          .addField("Mention prefix", `<@${client.user.id}>`, false)
          .setFooter("Labyrinth")
        msg.channel.send(prefixEmbed)
      }
    break;
		case "eval":
			if (msg.author.id !== `717417879355654215`) return
			function clean(text) {
				if (typeof(text) === "string")
					return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
				else
						return text;
			}
			const evalFunction = async () => {
				try {
					let evaled = eval(args.join(" "));
					if (typeof evaled !== "string")
					evaled = require("util").inspect(evaled);
					msg.channel.send(clean(evaled), {code:"xl"});
				}
				catch (err) {
					msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
				}
			}
			evalFunction()
			break;
		case "avatar":
		case "av":
		case "icon":
			let currentIcon = await icons.get(msg.author.id)
			if(!currentIcon) {
				currentIcon = "😑"
			}
			let chooseAIconEmbed = new MessageEmbed()
				.setColor("GREEN")
				.setTitle("Choose an icon!")
				.setDescription(`**${currentIcon}** is your current icon`)
			
			const checkNumber = async message => {
				let filter = m => m.author.id == msg.author.id
				let choosenIcon = await msg.channel.awaitMessages(filter, {time: 60000, max:1, errors: ['time']}).catch(()=> msg.channel.send("You didn't enter anything!"))
				try{choosenIcon}catch{return}
				if(choosenIcon.first().content.toLowerCase() === 'cancel') return msg.channel.send("Cancelled!")
				if(choosenIcon.first().content !== "1" && choosenIcon.first().content !== "2" && choosenIcon.first().content !== "3" && choosenIcon.first().content !== "4" && choosenIcon.first().content !== "5") return msg.channel.send("The options are only 1, 2, 3, 4, or 5")
				return parseInt(choosenIcon.first().content)
			} 
			if(currentIcon === '🤓'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🧐, 2: 😳, 3: 🥵, 4: 🤡, 5: 😑 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🧐")
					icons.set(msg.author.id, "🧐")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 😳")
					icons.set(msg.author.id, "😳")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 🥵")
					icons.set(msg.author.id, "🥵")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🤡")
					icons.set(msg.author.id, "🤡")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 😑")
					icons.set(msg.author.id, "😑")
				}
			}else if(currentIcon === '🧐'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🤓, 2: 😳, 3: 🥵, 4: 🤡, 5: 😑 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🤓")
					icons.set(msg.author.id, "🤓")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 😳")
					icons.set(msg.author.id, "😳")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 🥵")
					icons.set(msg.author.id, "🥵")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🤡")
					icons.set(msg.author.id, "🤡")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 😑")
					icons.set(msg.author.id, "😑")
				}else{
					console.log(choosenIcon)
				}
			}else if(currentIcon === '😳'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🤓, 2: 🧐, 3: 🥵, 4: 🤡, 5: 😑 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🤓")
					icons.set(msg.author.id, "🤓")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 🧐")
					icons.set(msg.author.id, "🧐")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 🥵")
					icons.set(msg.author.id, "🥵")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🤡")
					icons.set(msg.author.id, "🤡")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 😑")
					icons.set(msg.author.id, "😑")
				}
			}else if(currentIcon === '🥵'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🤓, 2: 🧐, 3: 😳, 4: 🤡, 5: 😑 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🤓")
					icons.set(msg.author.id, "🤓")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 🧐")
					icons.set(msg.author.id, "🧐")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 😳")
					icons.set(msg.author.id, "😳")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🤡")
					icons.set(msg.author.id, "🤡")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 😑")
					icons.set(msg.author.id, "😑")
				}
			}else if(currentIcon === '🤡'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🤓, 2: 🧐, 3: 😳, 4: 🥵, 5: 😑 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🤓")
					icons.set(msg.author.id, "🤓")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 🧐")
					icons.set(msg.author.id, "🧐")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 😳")
					icons.set(msg.author.id, "😳")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🥵")
					icons.set(msg.author.id, "🥵")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 😑")
					icons.set(msg.author.id, "😑")
				}
			}else if(currentIcon === '😑'){
				chooseAIconEmbed
					.addField('Choose:', '1: 🤓, 2: 🧐, 3: 😳, 4: 🥵, 5: 🤡 (Enter the number beside the icon you want) (type cancel if you do not want to change)', false)
				await msg.channel.send(chooseAIconEmbed)
				let choosenIcon = await checkNumber(msg)
				if(choosenIcon == 1){
					msg.channel.send("Set your avatar to 🤓")
					icons.set(msg.author.id, "🤓")
				}else if(choosenIcon == 2){
					msg.channel.send("Set your avatar to 🧐")
					icons.set(msg.author.id, "🧐")
				}else if(choosenIcon == 3){
					msg.channel.send("Set your avatar to 😳")
					icons.set(msg.author.id, "😳")
				}else if(choosenIcon == 4){
					msg.channel.send("Set your avatar to 🥵")
					icons.set(msg.author.id, "🥵")
				}else if(choosenIcon == 5){
					msg.channel.send("Set your avatar to 🤡")
					icons.set(msg.author.id, "🤡")
				}
			}

			break;
  }
})


client.login(process.env.token)