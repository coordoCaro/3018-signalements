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

function texteStatut(statut) {
  const descriptions = {
    'ouvert':    '🟡 En cours — dossier ouvert, en cours de rédaction',
    'a_valider': '🟣 À valider — dossier constitué, en relecture dirco',
    'envoye':    '🟢 Envoyé — dossier transmis au destinataire, cas clôturé',
  };
  return descriptions[statut] || '🟡 En cours — dossier ouvert, en cours de rédaction';
}

function buildBlocks({ numero, ecoutant, canal, mail, telephone, cadres, resume, user, now, statut, tagFds, tagRappel }) {
  const rappelElements = [];
  if (tagRappel === 'absent') {
    rappelElements.push({
      type: 'button',
      text: { type: 'plain_text', text: '+ Rappel' },
      action_id: 'tag_rappel_ajouter',
    });
  } else {
    rappelElements.push({
      type: 'button',
      text: { type: 'plain_text', text: tagRappel === 'faire' ? '📞 Rappel à faire' : '✅ Rappel fait' },
      action_id: 'tag_rappel',
    });
  }

  return [
    {
      type: 'section',
      block_id: 'bloc_statut',
      text: {
        type: 'mrkdwn',
        text: `🗂️ *Dossier ${numero}*\n*Statut :* ${texteStatut(statut)}\n_Écoutant : ${ecoutant} · Ouvert le ${now}_`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Canal :*\n${canal}` },
        { type: 'mrkdwn', text: `*Mail contact :*\n${mail}` },
        { type: 'mrkdwn', text: `*Téléphone :*\n${telephone}` },
        { type: 'mrkdwn', text: `*Cadre(s) informé(s) :*\n${cadres}` },
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
          text: { type: 'plain_text', text: '🟡 En cours' },
          action_id: 'statut_ouvert',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🟣 À valider' },
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
      block_id: 'actions_tags_fds',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: tagFds === 'recu' ? '✅ FDS reçu' : '⏳ En attente FDS' },
          action_id: 'tag_fds',
        },
      ],
    },
    {
      type: 'actions',
      block_id: 'actions_tags',
      elements: rappelElements,
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Dossier ouvert par <@${user}>` },
      ],
    },
  ];
}

function extraireInfos(blocks) {
  const blocStatut = blocks.find(b => b.block_id === 'bloc_statut');
  const text = blocStatut?.text?.text || '';

  const numero = (text.match(/Dossier (.+?)\*/) || [])[1] || '';
  const ecoutant = (text.match(/Écoutant : (.+?) ·/) || [])[1] || '';
  const now = (text.match(/Ouvert le (.+?)_/) || [])[1] || '';

  const fieldsBlock = blocks.find(b => b.fields);
  const fields = fieldsBlock?.fields || [];
  const canal = (fields[0]?.text || '').replace('*Canal :*\n', '');
  const mail = (fields[1]?.text || '').replace('*Mail contact :*\n', '');
  const telephone = (fields[2]?.text || '').replace('*Téléphone :*\n', '');
  const cadres = (fields[3]?.text || '').replace('*Cadre(s) informé(s) :*\n', '');

  const resumeBlock = blocks.find(b => b.text?.text?.startsWith('*Résumé :*'));
  const resume = (resumeBlock?.text?.text || '').replace('*Résumé :*\n', '');

  const contextBlock = blocks.find(b => b.type === 'context');
  const user = (contextBlock?.elements?.[0]?.text || '')
    .replace('Dossier ouvert par ', '').replace('<@', '').replace('>', '');

  const tagsFdsBlock = blocks.find(b => b.block_id === 'actions_tags_fds');
  const tagFdsEl = tagsFdsBlock?.elements?.find(e => e.action_id === 'tag_fds');
  const tagFds = tagFdsEl?.text?.text === '✅ FDS reçu' ? 'recu' : 'attente';

  const tagsBlock = blocks.find(b => b.block_id === 'actions_tags');
  const tagRappelEl = tagsBlock?.elements?.find(e => ['tag_rappel', 'tag_rappel_ajouter'].includes(e.action_id));
  let tagRappel = 'absent';
  if (tagRappelEl?.action_id === 'tag_rappel') {
    tagRappel = tagRappelEl.text.text === '✅ Rappel fait' ? 'fait' : 'faire';
  }

  return { numero, ecoutant, canal, mail, telephone, cadres, resume, user, now, tagFds, tagRappel };
}

function detecterStatut(blocks) {
  const text = blocks.find(b => b.block_id === 'bloc_statut')?.text?.text || '';
  if (text.includes('À valider')) return 'a_valider';
  if (text.includes('Envoyé')) return 'envoye';
  return 'ouvert';
}

['statut_ouvert', 'statut_a_valider', 'statut_envoye'].forEach((actionId) => {
  app.action(actionId, async ({ ack, body, client }) => {
    await ack();
    const message = body.message;
    const statutMap = { statut_ouvert: 'ouvert', statut_a_valider: 'a_valider', statut_envoye: 'envoye' };
    const statut = statutMap[actionId];
    const infos = extraireInfos(message.blocks);

    await client.chat.update({
      channel: body.channel.id,
      ts: message.ts,
      blocks: buildBlocks({ ...infos, statut }),
      text: message.text,
    });

    if (actionId === 'statut_envoye') {
      try { await client.pins.remove({ channel: body.channel.id, timestamp: message.ts }); } catch (e) {}
    } else {
      try { await client.pins.add({ channel: body.channel.id, timestamp: message.ts }); } catch (e) {}
    }
  });
});

app.action('tag_fds', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;
  const infos = extraireInfos(message.blocks);
  const statut = detecterStatut(message.blocks);
  const newTagFds = infos.tagFds === 'recu' ? 'attente' : 'recu';

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: buildBlocks({ ...infos, statut, tagFds: newTagFds }),
    text: message.text,
  });
});

app.action('tag_rappel_ajouter', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;
  const infos = extraireInfos(message.blocks);
  const statut = detecterStatut(message.blocks);

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: buildBlocks({ ...infos, statut, tagRappel: 'faire' }),
    text: message.text,
  });
});

app.action('tag_rappel', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;
  const infos = extraireInfos(message.blocks);
  const statut = detecterStatut(message.blocks);
  const newTagRappel = infos.tagRappel === 'fait' ? 'faire' : 'fait';

  await client.chat.update({
    channel: body.channel.id,
    ts: message.ts,
    blocks: buildBlocks({ ...infos, statut, tagRappel: newTagRappel }),
    text: message.text,
  });
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bot 3018 démarré');
})();
