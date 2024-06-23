import { Component, Input } from '@angular/core';
import { Groupe } from 'src/class/groupe';

@Component({
  selector: 'app-groupe-detail',
  templateUrl: './groupe-detail.component.html',
  styleUrls: ['./groupe-detail.component.css']
})
export class GroupeDetailComponent {
  @Input() ListeGroupe:Groupe[];
  @Input() Select_Groupe:Groupe[];
  
}
