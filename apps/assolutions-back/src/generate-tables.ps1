param(
  [string]$Root = "."
)

$tables = @(
  "addinfo",
  "compte_bancaire",
  "contrat_prof",
  "cours_professeur",
  "document",
  "flux_financier",
  "groupes",
  "inscription_seance",
  "inscription_saison",
  "lien_groupe",
  "lieu",
  "mail_account",
  "mail_project",
  "mail_record",
  "note",
  "operation",
  "professeur",
  "seance_professeur",
  "stock"
)

function ToPascalCase([string]$name) {
  return ($name -split "_" | ForEach-Object { $_.Substring(0,1).ToUpper() + $_.Substring(1) }) -join ""
}

function EnsureDir([string]$path) {
  if (!(Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

function WriteIfMissing([string]$path, [string]$content) {
  if (Test-Path $path) {
    Write-Host "SKIP exists: $path"
  } else {
    $content | Out-File -Encoding utf8 $path
    Write-Host "CREATE: $path"
  }
}

$rootPath = Resolve-Path $Root

foreach ($t in $tables) {
  $dir = Join-Path $rootPath $t
  EnsureDir $dir

  $Pascal = ToPascalCase $t

  $entityPath = Join-Path $dir "$t.entity.ts"
  $dtoPath = Join-Path $dir "$t.dto.ts"
  $servicePath = Join-Path $dir "$t.service.ts"
  $controllerPath = Join-Path $dir "$t.controller.ts"
  $modulePath = Join-Path $dir "$t.module.ts"

  $entity = @"
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: '$t' })
export class ${Pascal}Entity {
  @PrimaryGeneratedColumn()
  id: number;

  // TODO: columns
}
"@

  $dto = @"
// DTOs for $t
export class Create${Pascal}Dto {
  // TODO
}

export class Update${Pascal}Dto {
  // TODO
}
"@

  $service = @"
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistryService } from '../registry/registry.service';
import { ${Pascal}Entity } from './$t.entity';
import { Create${Pascal}Dto, Update${Pascal}Dto } from './$t.dto';

@Injectable()
export class ${Pascal}Service {
  constructor(
    @InjectRepository(${Pascal}Entity)
    private readonly repo: Repository<${Pascal}Entity>,
    private readonly registry: RegistryService,
  ) {}

  // TODO: list/get/create/update/remove
}
"@

  $controller = @"
import { Controller } from '@nestjs/common';
import { ${Pascal}Service } from './$t.service';

@Controller('$t')
export class ${Pascal}Controller {
  constructor(private readonly service: ${Pascal}Service) {}

  // TODO: endpoints
}
"@

  $module = @"
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistryModule } from '../registry/registry.module';
import { ${Pascal}Controller } from './$t.controller';
import { ${Pascal}Entity } from './$t.entity';
import { ${Pascal}Service } from './$t.service';

@Module({
  imports: [TypeOrmModule.forFeature([${Pascal}Entity]), RegistryModule],
  controllers: [${Pascal}Controller],
  providers: [${Pascal}Service],
})
export class ${Pascal}Module {}
"@

  WriteIfMissing $entityPath $entity
  WriteIfMissing $dtoPath $dto
  WriteIfMissing $servicePath $service
  WriteIfMissing $controllerPath $controller
  WriteIfMissing $modulePath $module
}

Write-Host "`nDone."
