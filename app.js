const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000,
});

app.command('/signal', async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'nouveau_dossier',
      title: { type: 'plain_text', text: 'Nouveau signalement' },
      submit: { type: 'plain_text', text: 'Créer le dossier' },
      close: { type: 'plain_text', text: 'Annuler' },
      blocks: [
        {
          type: 'input',
          block_id: 'numero_dossier',
          label: { type: 'plain_text', text: 'Numéro de dossier' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : 2026-047' },
          },
        },
        {
          type: 'input',
          block_id: 'ecoutant',
          label: { type: 'plain_text', text: 'Écoutant en charge' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            initial_value: body.user_name,
          },
        },
        {
          type: 'input',
          block_id: 'canal',
          label: { type: 'plain_text', text: "Canal d'arrivée" },
          element: {
            type: 'static_select',
            action_id: 'valeur',
            options: [
              { text: { type: 'plain_text', text: '📞 Téléphone' }, value: 'telephone' },
              { text: { type: 'plain_text', text: '💬 Tchat' }, value: 'tchat' },
              { text: { type: 'plain_text', text: '📧 Mail' }, value: 'mail' },
            ],
          },
        },
        {
          type: 'input',
          block_id: 'mail_contact',
          optional: true,
          label: { type: 'plain_text', text: 'Mail de contact de la victime' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'adresse@exemple.com' },
          },
        },
        {
          type: 'input',
          block_id: 'telephone',
          optional: true,
          label: { type: 'plain_text', text: 'Téléphone de contact' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : 06 12 34 56 78' },
          },
        },
        {
          type: 'input',
          block_id: 'cadres',
          optional: true,
          label: { type: 'plain_text', text: 'Cadre(s) informé(s)' },
          element: {
            type: 'multi_static_select',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Sélectionnez un ou plusieurs cadres' },
            options: [
              { text: { type: 'plain_text', text: 'Simon' }, value: 'Simon' },
              { text: { type: 'plain_text', text: 'Diane' }, value: 'Diane' },
              { text: { type: 'plain_text', text: 'Caroline' }, value: 'Caroline' },
              { text: { type: 'plain_text', text: 'Pauline' }, value: 'Pauline' },
              { text: { type: 'plain_text', text: 'Manu' }, value: 'Manu' },
            ],
          },
        },
        {
          type: 'input',
          block_id: 'resume',
          label: { type: 'plain_text', text: 'Résumé de la situation' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Décrivez brièvement la situation...' },
          },
          hint: {
            type: 'plain_text',
            text: "⚠️ Ne pas inclure de nom, prénom, adresse, URL, identifiants ou toute donnée permettant d'identifier la victime.",
          },
        },
      ],
    },
  });
});

app.view('nouveau_dossier', async ({ ack, body, view, client }) => {
  await ack();

  const vals = view.state.values;
  const numero = vals.numero_dossier.valeur.value;
  const ecoutant = vals.ecoutant.valeur.value;
  const canal = vals.canal.valeur.selected_option.text.text;
  const mail = vals.mail_contact.valeur.value || 'Non renseigné';
  const telephone = vals.telephone.valeur.value || 'Non renseigné';
  const cadresRaw = vals.cadres.valeur.selected_options;
  const cadres = cadresRaw && cadresRaw.length > 0
    ? cadresRaw.map(o => o.value).join(', ')
    : 'Non renseigné';
  const resume = vals.resume.valeur.value;
  const user = body.user.id;
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const channelId = process.env.SLACK_CHANNEL_ID;

  const message = await client.chat.postMessage({
    channel: channelId,
    text: `Nouveau dossier ${numero}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🗂️ *Dossier ${numero}*\n*Statut :* 🟡 Ouvert`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Écoutant :*\n${ecoutant}` },
          { type: 'mrkdwn', text: `*Canal :*\n${canal}` },
          { type: 'mrkdwn', text: `*Mail contact :*\n${mail}` },
          { type: 'mrkdwn', text: `*Téléphone :*\n${telephone}` },
          { type: 'mrkdwn', text: `*Cadre(s) informé(s) :*\n${cadres}` },
          { type: 'mrkdwn', text: `*Ouvert le :*\n${now}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Résumé :*\n${resume}` },
      },
      { type: 'divider' },
      {
        type: 'actions',
        block_id: 'actions_statut',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🟣 À valider — dirco' },
            action_id: 'statut_a_valider',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🟢 Envoyé' },
            action_id: 'statut_envoye',
            style: 'primary',
          },
        ],
      },
      {
        type: 'actions',
        block_id: 'actions_tags',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '⏳ En attente FDS' },
            action_id: 'tag_fds',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '+ Rappel' },
            action_id: 'tag_rappel_ajouter',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Dossier ouvert par <@${user}>` },
        ],
      },
    ],
  });

  await client.pins.add({
    channel: channelId,
    timestamp: message.ts,
  });

  await client.chat.postMessage({
    channel: channelId,
    thread_ts: message.ts,
    text: `📁 Dossier *${numero}* ouvert par <@${user}> le ${now}`,
  });
});

// Statuts
const statuts = {
  statut_a_valider: { emoji: '🟣', texte: 'À valider — dirco' },
  statut_envoye:    { emoji: '🟢', texte: 'Envoyé' },
};

Object.entries(statuts).forEach(([actionId, statut]) => {
  app.action(actionId, async ({ ack, body, client }) => {
    await ack();
    const message = body.message;
    const user = body.user.id;

    const updatedBlocks = message.blocks.map((block) => {
      if (block.type === 'section' && block.text?.text?.includes('Statut :')) {
        return {
          ...block,
          text: {
            ...block.text,
            text: block.text.text.replace(
              /\*Statut :\*.*/,
              `*Statut :* ${statut.emoji} ${statut.texte}`
            ),
          },
        };
      }
      return block;
    });

    await client.chat.update({
      channel: body.channel.id,
      ts: message.ts,
      blocks: updatedBlocks,
      text: message.text,
    });

    if (actionId === 'statut_envoye') {
      try {
        await client.pins.remove({
          channel: body.channel.id,
          timestamp: message.ts,
        });
      } catch (e) {}
    }
  });
});

// Tag FDS — bascule entre En attente et Reçu
app.action('tag_fds', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_tags') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_fds') {
            const isAttendu = el.text.text === '⏳ En attente FDS';
            return {
              ...el,
              text: { type: 'plain_text', text: isAttendu ? '✅ FDS reçu' : '⏳ En attente FDS' },
            };
          }
          return el;
        }),
      };
    }
    return block;
  });

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: updatedBlocks,
    text: message.text,
  });
});

// Bouton + Rappel — fait apparaître le tag rappel
app.action('tag_rappel_ajouter', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_tags') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_rappel_ajouter') {
            return {
              ...el,
              text: { type: 'plain_text', text: '📞 Rappel à faire' },
              action_id: 'tag_rappel',
            };
          }
          return el;
        }),
      };
    }
    return block;
  });

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: updatedBlocks,
    text: message.text,
  });
});

// Tag Rappel — bascule entre À faire et Fait
app.action('tag_rappel', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_tags') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_rappel') {
            const isFaire = el.text.text === '📞 Rappel à faire';
            return {
              ...el,
              text: { type: 'plain_text', text: isFaire ? '✅ Rappel fait' : '📞 Rappel à faire' },
            };
          }
          return el;
        }),
      };
    }
    return block;
  });

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: updatedBlocks,
    text: message.text,
  });
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bot 3018 démarré');
})();
