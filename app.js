const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
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
            placeholder: { type: 'plain_text', text: 'Ex : 1234' },
          },
        },
        {
          type: 'input',
          block_id: 'nom_dossier',
          optional: true,
          label: { type: 'plain_text', text: 'Nom du dossier serveur' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : 2026_03_SP_NOM_1234' },
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
          label: { type: 'plain_text', text: 'Type de situation (mots-clés)' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : harcèlement, mineur, réseaux sociaux' },
          },
        },
      ],
    },
  });
});

function extraireChamps(blocks) {
  const titreBlock = blocks.find(b => b.text?.text?.includes('Dossier'));
  const numero = (titreBlock?.text?.text?.match(/Dossier (\S+)\*/) || [])[1] || '';

  const fieldsBlock = blocks.find(b => b.fields);
  const fields = fieldsBlock?.fields || [];
  const get = (label) => {
    const field = fields.find(f => f.text.startsWith(`*${label}`));
    return (field?.text || '').split('\n')[1] || '';
  };

  const nomDossier = get('Nom dossier serveur');
  const ecoutant = get('Écoutant');
  const mail = get('Mail contact');
  const telephone = get('Téléphone');
  const cadres = get('Cadre(s) informé(s)');

  const resumeBlock = blocks.find(b => b.text?.text?.includes('Type de situation'));
  const resume = (resumeBlock?.text?.text || '').split('\n')[1] || '';

  return { numero, nomDossier, ecoutant, mail, telephone, cadres, resume };
}

function buildFicheBlocks({ numero, nomDossier, ecoutant, canal, mail, telephone, cadres, resume, user, now }) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `🗂️ *Dossier ${numero}*\n*Statut :* 🟡 Ouvert — dossier ouvert, en cours de rédaction`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Nom dossier serveur :*\n${nomDossier}` },
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
      text: { type: 'mrkdwn', text: `*Type de situation :*\n${resume}` },
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
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔴 Abandonné' },
          action_id: 'statut_abandonne',
        },
      ],
    },
    {
      type: 'actions',
      block_id: 'actions_fds',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ En attente FDS' },
          action_id: 'tag_fds_ajouter',
        },
      ],
    },
    {
      type: 'actions',
      block_id: 'actions_rappel',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '+ Rappel' },
          action_id: 'tag_rappel_ajouter',
        },
      ],
    },
    {
      type: 'actions',
      block_id: 'actions_modifier',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✏️ Modifier' },
          action_id: 'modifier_dossier',
        },
      ],
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Dossier ouvert par <@${user}>` },
      ],
    },
  ];
}

app.view('nouveau_dossier', async ({ ack, body, view, client }) => {
  await ack();

  const vals = view.state.values;
  const numero = vals.numero_dossier.valeur.value;
  const nomDossier = vals.nom_dossier.valeur.value || 'Non renseigné';
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
    blocks: buildFicheBlocks({ numero, nomDossier, ecoutant, canal, mail, telephone, cadres, resume, user, now }),
  });

  await client.pins.add({
    channel: channelId,
    timestamp: message.ts,
  });
});

const statuts = {
  statut_ouvert:    { emoji: '🟡', texte: 'Ouvert — dossier ouvert, en cours de rédaction' },
  statut_a_valider: { emoji: '🟣', texte: 'À valider — dossier constitué, en relecture dirco' },
  statut_envoye:    { emoji: '🟢', texte: 'Envoyé — dossier transmis au destinataire, cas clôturé' },
  statut_abandonne: { emoji: '🔴', texte: 'Abandonné — informations insuffisantes' },
};

Object.entries(statuts).forEach(([actionId, statut]) => {
  app.action(actionId, async ({ ack, body, client }) => {
    await ack();
    const message = body.message;

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

    if (actionId === 'statut_envoye' || actionId === 'statut_abandonne') {
      try { await client.pins.remove({ channel: body.channel.id, timestamp: message.ts }); } catch (e) {}
    } else {
      try { await client.pins.add({ channel: body.channel.id, timestamp: message.ts }); } catch (e) {}
    }
  });
});

// Bouton + En attente FDS — active le tag ET notifie le canal plateformes
app.action('tag_fds_ajouter', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;
  const infos = extraireChamps(message.blocks);

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_fds') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_fds_ajouter') {
            return {
              ...el,
              text: { type: 'plain_text', text: '⏳ En attente FDS' },
              action_id: 'tag_fds',
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

  // Notification dans le canal plateformes
  await client.chat.postMessage({
    channel: process.env.SLACK_CHANNEL_PLATEFORMES,
    text: `📋 *En attente d'un FDS*\n*Dossier :* ${infos.numero} — ${infos.resume}\n*Écoutant :* ${infos.ecoutant}\n*Mail de contact :* ${infos.mail}`,
  });
});

// Tag FDS — bascule entre En attente et Reçu
app.action('tag_fds', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_fds') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_fds') {
            const isAttendu = el.text.text.includes('attente');
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

app.action('tag_rappel_ajouter', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_rappel') {
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

app.action('tag_rappel', async ({ ack, body, client }) => {
  await ack();
  const message = body.message;

  const updatedBlocks = message.blocks.map((block) => {
    if (block.block_id === 'actions_rappel') {
      return {
        ...block,
        elements: block.elements.map((el) => {
          if (el.action_id === 'tag_rappel') {
            const isFaire = el.text.text.includes('faire');
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

app.action('modifier_dossier', async ({ ack, body, client }) => {
  await ack();

  const message = body.message;
  const channelId = body.channel.id;
  const messageTs = message.ts;
  const infos = extraireChamps(message.blocks);

  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'modifier_dossier_submit',
      private_metadata: JSON.stringify({ channelId, messageTs }),
      title: { type: 'plain_text', text: 'Modifier le dossier' },
      submit: { type: 'plain_text', text: 'Mettre à jour' },
      close: { type: 'plain_text', text: 'Annuler' },
      blocks: [
        {
          type: 'input',
          block_id: 'nom_dossier',
          optional: true,
          label: { type: 'plain_text', text: 'Nom du dossier serveur' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            initial_value: infos.nomDossier === 'Non renseigné' ? '' : infos.nomDossier,
            placeholder: { type: 'plain_text', text: 'Ex : 2026_03_SP_NOM_1234' },
          },
        },
        {
          type: 'input',
          block_id: 'ecoutant',
          label: { type: 'plain_text', text: 'Écoutant en charge' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            initial_value: infos.ecoutant,
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
            initial_value: infos.mail === 'Non renseigné' ? '' : infos.mail,
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
            initial_value: infos.telephone === 'Non renseigné' ? '' : infos.telephone,
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
          label: { type: 'plain_text', text: 'Type de situation (mots-clés)' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            initial_value: infos.resume,
            placeholder: { type: 'plain_text', text: 'Ex : harcèlement, mineur, réseaux sociaux' },
          },
        },
      ],
    },
  });
});

app.view('modifier_dossier_submit', async ({ ack, body, view, client }) => {
  await ack();

  const { channelId, messageTs } = JSON.parse(view.private_metadata);
  const vals = view.state.values;

  const nomDossier = vals.nom_dossier.valeur.value || 'Non renseigné';
  const ecoutant = vals.ecoutant.valeur.value;
  const mail = vals.mail_contact.valeur.value || 'Non renseigné';
  const telephone = vals.telephone.valeur.value || 'Non renseigné';
  const cadresRaw = vals.cadres.valeur.selected_options;
  const cadres = cadresRaw && cadresRaw.length > 0
    ? cadresRaw.map(o => o.value).join(', ')
    : 'Non renseigné';
  const resume = vals.resume.valeur.value;

  const result = await client.conversations.history({
    channel: channelId,
    latest: messageTs,
    limit: 1,
    inclusive: true,
  });

  const message = result.messages[0];

  const updatedBlocks = message.blocks.map((block) => {
    if (block.fields) {
      return {
        ...block,
        fields: block.fields.map((field) => {
          if (field.text.includes('Nom dossier')) return { ...field, text: `*Nom dossier serveur :*\n${nomDossier}` };
          if (field.text.includes('Écoutant')) return { ...field, text: `*Écoutant :*\n${ecoutant}` };
          if (field.text.includes('Mail contact')) return { ...field, text: `*Mail contact :*\n${mail}` };
          if (field.text.includes('Téléphone')) return { ...field, text: `*Téléphone :*\n${telephone}` };
          if (field.text.includes('Cadre')) return { ...field, text: `*Cadre(s) informé(s) :*\n${cadres}` };
          return field;
        }),
      };
    }
    if (block.text?.text?.includes('Type de situation')) {
      return { ...block, text: { ...block.text, text: `*Type de situation :*\n${resume}` } };
    }
    return block;
  });

  await client.chat.update({
    channel: channelId,
    ts: messageTs,
    blocks: updatedBlocks,
    text: message.text,
  });
});

app.shortcut('nouveau_signalement', async ({ ack, shortcut, client }) => {
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
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
            placeholder: { type: 'plain_text', text: 'Ex : 1234' },
          },
        },
        {
          type: 'input',
          block_id: 'nom_dossier',
          optional: true,
          label: { type: 'plain_text', text: 'Nom du dossier serveur' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : 2026_03_SP_NOM_1234' },
          },
        },
        {
          type: 'input',
          block_id: 'ecoutant',
          label: { type: 'plain_text', text: 'Écoutant en charge' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
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
          label: { type: 'plain_text', text: 'Type de situation (mots-clés)' },
          element: {
            type: 'plain_text_input',
            action_id: 'valeur',
            placeholder: { type: 'plain_text', text: 'Ex : harcèlement, mineur, réseaux sociaux' },
          },
        },
      ],
    },
  });
});

(async () => {
  await app.start();
  console.log('⚡️ Bot 3018 démarré');
})();
