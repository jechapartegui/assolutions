import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'btn',
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.css']
})
export class CustomButtonComponent {
  @Input() type_button:string;
  @Input() disabled:boolean = false;
}
