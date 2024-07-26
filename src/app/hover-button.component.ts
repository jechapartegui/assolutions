import { Component, Input } from '@angular/core';

@Component({
  selector: 'hover-button',
  templateUrl: './hover-button.component.html',
  styleUrls: ['./hover-button.component.css']
})
export class HoverButtonComponent {
  public showText:boolean = false;
  @Input() public nomclass:string = "button";
  @Input() public libelle:string;
  @Input() public nomicon:string;
}
