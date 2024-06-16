import { Component, OnInit } from '@angular/core';
import { trigger, state, style, animate, transition, group } from '@angular/animations';
import { code_alert } from '../global';
export class notification {
  object: string;
  content: string;
  color: code_alert;
  dismissible: boolean;
  timeLeft: number = 0;
}
@Component({
  selector: 'notif_jecha',
  templateUrl: './custom-notification.component.html',
  styleUrls: ['./custom-notification.component.scss'],
  animations: [
    trigger("notification", [
      state('void', style({ transform: 'translateX(100%)' })),
      transition(':enter', animate('500ms ease-in-out', style({ transform: 'translateX(0%)' }))),
      transition(':leave', animate('300ms ease-in', style({ transform: 'translateX(100%)' }))),
    ]),
    trigger('expandCollapse', [
      state('open', style({
        'height': '*',
        'opacity': '1'
      })),
      state('close', style({
        'height': '0px',
        'opacity': '0'
      })),
      transition('open <=> close', animate(300))
    ])
  ]
})
export class NotifJechaComponent implements OnInit {

  constructor() { }
  stickyNotifications: notification[] = [];
  private interval;
  ngOnInit(): void {
  }

  startTimer() {
    //   console.log("startTimer");
    this.interval = setInterval(() => {
      //  console.log("setinterval");
      this.stickyNotifications.forEach(element => {
        if (element.color === code_alert.OK || element.color === code_alert.Info) {
          element.timeLeft--;
          if (element.timeLeft == 0) {
            this.Close(element);
          }
        }
      });
    }, 1000)
  }

  pauseTimer() {
    clearInterval(this.interval);
    // console.log("pauseTimer");
  }
  display_message(message: any) {
    console.log("display_message"); 
    console.log(message)
  }
  display_notification(item: notification) {
    if (item.color === code_alert.OK) {
      item.timeLeft = 5;
    }
    if (item.color === code_alert.Info) {
      item.timeLeft = 10;
    }
    this.stickyNotifications.push(item);
    var sn = this.stickyNotifications.filter(x => x.color === code_alert.OK || x.color === code_alert.Info);
    if (sn.length == 1 && (item.color === code_alert.Info || item.color === code_alert.OK)) {
      this.startTimer();
    }
  }
  display(object: string, content: string, color: code_alert) {
    var item = new notification();
    item.object = object;
    item.content = content;
    item.color = color;
    this.display_notification(item);
  }

  Close(msg) {
    this.stickyNotifications.forEach((val, index) => {
      if (val == msg) this.stickyNotifications.splice(index, 1);
    })
    var sn = this.stickyNotifications.filter(x => x.color === code_alert.OK || x.color === code_alert.Info);
    if (sn.length == 0 && (msg.color === code_alert.Info || msg.color === code_alert.OK)) {
      this.pauseTimer();
    }
  }

}
