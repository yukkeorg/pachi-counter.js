// vim: ft=javascript ts=2 sts=2 sw=2

import '../scss/style.scss';

import AnimationCounter from './animationcounter.js';
import $ from './selector.js';

// Elements
const p_title = $('#pcount_title');
const p_total = $('#pcount_total');
const p_current = $('#pcount_current');
const p_bonus = $('#pcount_bonus');
const p_bonus_chain = $('#pcount_bonus_chain');

new AnimationCounter($('#pcount_points'), 500, 20);

// Web socket
const ws = new WebSocket(`ws://${window.location.host}`);

ws.addEventListener('open', () => {});

ws.addEventListener('message', (message) => {
  console.log("recieved:" + message);

  const json = JSON.parse(message.data);
  if(!('type' in json)) {
    return;
  }

  switch(json.type) {
    case "counter":
      p_total.textContent = json.total;
      p_current.textContent = json.current;
      p_bonus.textContent = json.bonus;
      p_bonus_chain.textContent = json.bonus_chain;

      if(json.is_bonustime) {
        p_current.classList.add('chance-time');
      } else {
        p_current.classList.remove('chance-time');
      }
      if(json.is_chancetime) {
        p_bonus.classList.add('chance-time');
      } else {
        p_bonus.classList.remove('chance-time');
      }
      break;

    case "title":
      if('title' in json) {
        p_title.innerHTML = json.title;
      }
      break;
  }
});
