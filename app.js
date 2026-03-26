const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
});

// Commande /signal — ouvre le formulaire modal
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
          label: { type: 'plain_text', text: 'Mail de contact de la victime' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'adresse@exemple.com' },
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
            text: '⚠️ Ne pas inclure de nom, prénom, adresse, URL, identifiants ou toute donnée permettant d\'identifier la victime.',
          },
        },
      ],
    },
  });
});

// Soumission du formulaire — crée la fiche dans le canal
app.view('nouveau_dossier', async ({ ack, body, view, client }) => {
  await ack();

  const vals = view.state.values;
  const numero = vals.numero_dossier.valeur.value;
  const ecoutant = vals.ecoutant.valeur.value;
  const canal = vals.canal.valeur.selected_option.text.text;
  const mail = vals.mail_contact.valeur.value;
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
          text: `*🗂️ Dossier ${numero}*\n*Statut :* 🟡 En attente du mail formulaire`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*👤 Écoutant :*\n${ecoutant}` },
          { type: 'mrkdwn', text: `*📡 Canal :*\n${canal}` },
          { type: 'mrkdwn', text: `*📧 Mail contact :*\n${mail}` },
          { type: 'mrkdwn', text: `*🕐 Ouvert le :*\n${now}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*📝 Résumé :*\n${resume}` },
      },
      { type: 'divider' },
      {
        type: 'actions',
        block_id: 'actions_statut',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📨 Mail reçu' },
            action_id: 'statut_mail_recu',
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '✏️ Art. 40 rédigé' },
            action_id: 'statut_redige',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Validé cadre' },
            action_id: 'statut_valide',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '📤 Envoyé procureur' },
            action_id: 'statut_envoye',
            style: 'danger',
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

  // Ouvre un fil de discussion automatiquement
  await client.chat.postMessage({
    channel: channelId,
    thread_ts: message.ts,
    text: `📁 Fil de suivi du dossier *${numero}*\nUtilisez ce fil pour les échanges et mises à jour sur ce dossier.`,
  });
});

// Gestion des boutons de statut
const statuts = {
  statut_mail_recu:  { emoji: '🟠', texte: 'Mail formulaire reçu — en attente de rédaction Art. 40' },
  statut_redige:     { emoji: '🔵', texte: 'Art. 40 rédigé — en attente de validation cadre' },
  statut_valide:     { emoji: '🟣', texte: 'Validé par le cadre — en attente d\'envoi au procureur' },
  statut_envoye:     { emoji: '🟢', texte: 'Envoyé au procureur ✓' },
};

Object.entries(statuts).forEach(([actionId, statut]) => {
  app.action(actionId, async ({ ack, body, client }) => {
    await ack();

    const message = body.message;
    const user = body.user.id;
    const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

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

    await client.chat.postMessage({
      channel: body.channel.id,
      thread_ts: message.ts,
      text: `${statut.emoji} Statut mis à jour par <@${user}> le ${now} : *${statut.texte}*`,
    });
  });
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bot 3018 démarré');
})();
