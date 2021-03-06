const database = require('../model/storage');
const api = require('../model/api');
const translation = require('../translation/translation');

async function remainingAttacks(message, server_id) {
    let channel = message.channel;
    database.getClan(server_id).then((value) => { //get the clan tag
        if (value && value.tag) {
            api.currentwar(value.tag).then(async (response) => { //get info of current war
                if (response.data.state == 'notInWar' || response.data.state == 'warEnded') {
                    channel.send(`Aucune GDC n'est en cours.`);
                } else {
                    let attacks = `Résumé des attaques de la GdC contre ${response.data.opponent.name} :`;
                    response.data.clan.members.sort(function (a, b) {
                        return a.mapPosition - b.mapPosition;
                    });

                    for (let i in response.data.clan.members) {
                        let member = response.data.clan.members[i];
                        let tag = member.tag.replace('#', '');
                        let discordId;
                        let discordMemberString = '';
                        await database.getPlayerByTag(tag).then(async (users) => { //get discord id of coc player
                            if (users.length > 0) {
                                discordId = users[0].id
                            }
                        }).catch(console.error);

                        if (discordId) {
                            await message.guild.members.fetch(discordId).then((discordMember) => {
                                if (discordMember) {
                                    discordMemberString = '(' + discordMember.toString() + ')';
                                }
                            }).catch(() => {
                                console.error('Utilisateur inconnu');
                            });
                        }

                        if (member.attacks) { //If user attacked
                            if (member.attacks.length == 1) { //if user make one attack
                                let countStars = 0;
                                for (let index in member.attacks) {
                                    countStars += member.attacks[index].stars
                                }
                                attacks += `
                - ${member.name} ${discordMemberString}, ${countStars >= 2 ? 'pas mal' : 'pas ouf'} tes ${countStars} étoiles pour ta première attaque, mais il t'en reste **une** autre attaque à effectuer ! :thinking:`;
                            } else {
                                let countStars = 0;
                                for (let index in member.attacks) {
                                    countStars += member.attacks[index].stars
                                }
                                attacks += `
                - ${member.name}, ${countStars >= 4 ? 'bien joué pour' : 'trop nul'} tes ${countStars} étoiles en deux attaques ! :${countStars >= 4 ? 'partying_face' : 'face_with_symbols_over_mouth'}:`;
                            }
                        } else {
                            attacks += `
                - ${member.name} ${discordMemberString}, il faut que tu fasses tes **deux** attaques ! :rage:`;
                        }
                    }
                    channel.send(attacks, { split: true });
                }
            }
            ).catch((error) => { console.error(error); channel.send(translation.french(error.response.data.message)) });
        } else {
            helpUndefinedTag(channel);
        }
    })
        .catch(console.error);
}

function helpUndefinedTag(channel) {
    channel.send('J\'ai beau être sorcier, je ne suis pas devin. Pense à ajouter ton tag de Clan (Utilise la commande `coc!lier aide`)');
}

function help(channel) {
    channel.send(`\`coc!gdc \`
  Affiche les attaques en gdc restantes`);
}


module.exports = function attacks(message) {
    if (!message.member.roles.cache.find(r => r.name === "Chef")) {
        message.channel.send(`Seul un vrai **Chef** peut utiliser cette commande :smiling_imp: `);
    } else {
        const tokens = message.content.split(' ');
        if (tokens[1]) {
            help(message.channel);
        } else {
            remainingAttacks(message, message.guild.id);
        }
    }
};