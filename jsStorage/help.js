module.exports = {
  'help': {
    description: 'Shows the list of commands or help on specified command.',
    format: 'help [command-name]'
  },
  'ping': {
    description: 'Checks connectivity with discord\'s servers.',
    format: 'ping'
  },
  'invite': {
    description: 'Shares the invite link',
    format: 'invite'
  },
  'prefix': {
    description: 'Shows you the server prefix, or sets the server prefix',
    format: 'prefix [new prefix]'
  },
	'play': {
		description: 'Starts a game of Labyrinth',
		format: 'play',
		aliases: ['start']
	},
	'guide': {
		description: 'Gives you a guide to Labyrinth',
		format: 'guide',
		aliases: ['how-to-play']
	},
	'icon': {
		description: 'Change or view your icon',
		format: 'icon',
		aliases: ['avatar', 'av']
	}
}