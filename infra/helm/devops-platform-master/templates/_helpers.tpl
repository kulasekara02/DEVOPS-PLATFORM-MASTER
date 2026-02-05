{{/*
=============================================================================
Helm Template Helpers - DevOps Platform Master
=============================================================================
*/}}

{{/*
Expand the name of the chart.
*/}}
{{- define "devops-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "devops-platform.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "devops-platform.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "devops-platform.labels" -}}
helm.sh/chart: {{ include "devops-platform.chart" . }}
{{ include "devops-platform.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "devops-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "devops-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "devops-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "devops-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the image name
*/}}
{{- define "devops-platform.image" -}}
{{- $registry := .global.imageRegistry | default "ghcr.io" -}}
{{- printf "%s/%s:%s" $registry .repository .tag }}
{{- end }}

{{/*
Frontend image
*/}}
{{- define "devops-platform.frontend.image" -}}
{{- $registry := .Values.global.imageRegistry | default "ghcr.io" -}}
{{- printf "%s/%s:%s" $registry .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- end }}

{{/*
API image
*/}}
{{- define "devops-platform.api.image" -}}
{{- $registry := .Values.global.imageRegistry | default "ghcr.io" -}}
{{- printf "%s/%s:%s" $registry .Values.api.image.repository .Values.api.image.tag }}
{{- end }}

{{/*
Worker image
*/}}
{{- define "devops-platform.worker.image" -}}
{{- $registry := .Values.global.imageRegistry | default "ghcr.io" -}}
{{- printf "%s/%s:%s" $registry .Values.worker.image.repository .Values.worker.image.tag }}
{{- end }}
