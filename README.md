# 🍽️ Delicias Ali - Sistema BPM para Catering

<p align="center">
  <img src="https://deliciasali.com/wp-content/uploads/2023/08/logo.png" alt="Logo Delicias Ali" width="300">
</p>

<p align="center">
  <b>Sistema de gestión logística con Business Process Management</b>
</p>

<p align="center">
  <a href="https://github.com/YehinnerTA/delicias-ali/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <a href="https://ionicframework.com/"><img src="https://img.shields.io/badge/Ionic-8.5.0-blue" alt="Ionic"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19.0.0-61DAFB" alt="React"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-Express-339933" alt="Node.js"></a>
  <a href="https://www.mysql.com/"><img src="https://img.shields.io/badge/MySQL-8.0-4479A1" alt="MySQL"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.9.0-3178C6" alt="TypeScript"></a>
  <a href="https://github.com/YehinnerTA/delicias-ali"><img src="https://img.shields.io/badge/Status-Completado-brightgreen" alt="Status"></a>
</p>

---

## 📖 Descripción

**Delicias Ali BPM** es un sistema de gestión de procesos logísticos diseñado para microempresas de catering. Fue desarrollado como proyecto de **Práctica Preprofesional I** en la Universidad César Vallejo, aplicando la metodología **Business Process Management (BPM)** para optimizar toda la cadena logística: desde la recepción del pedido hasta el control posterior al evento.

### 🎯 Problemas resueltos

| Problema | Solución | Resultado |
|----------|----------|-----------|
| ⏱️ Cálculo manual de insumos | Automatización con recetas estandarizadas | **2-3 horas → < 15 minutos** |
| 📋 Ausencia de checklist de materiales | Checklist digital con registro de salida/retorno | **Trazabilidad 100%** |
| 📱 Comunicación informal por WhatsApp | Registro centralizado en sistema | **Historial completo y auditoría** |

---

## 🎨 Paleta de colores institucionales

| Color | Código HEX | Uso |
|-------|------------|-----|
| <img src="https://via.placeholder.com/20/1a0a0e/1a0a0e" alt="#1a0a0e" width="20" height="20"> | `#1a0a0e` | Color principal (fondo oscuro) |
| <img src="https://via.placeholder.com/20/d90a46/d90a46" alt="#d90a46" width="20" height="20"> | `#d90a46` | Color secundario (acento, botones) |
| <img src="https://via.placeholder.com/20/ffcfd9/ffcfd9" alt="#ffcfd9" width="20" height="20"> | `#ffcfd9` | Color terciario (fondos claros) |
| <img src="https://via.placeholder.com/20/3c171c/3c171c" alt="#3c171c" width="20" height="20"> | `#3c171c` | Derivado oscuro 1 |
| <img src="https://via.placeholder.com/20/2c1115/2c1115" alt="#2c1115" width="20" height="20"> | `#2c1115` | Derivado oscuro 2 |

---

## ✨ Características principales

| Módulo | Funcionalidades |
|--------|-----------------|
| 🔐 **Autenticación** | Login JWT, roles (Administrador, Chef, Cajero, Logística), protección de rutas |
| 🏢 **Multiempresa** | Soporte para múltiples empresas desde una sola instalación |
| 📦 **Inventario** | Gestión de insumos, utensilios, postres, stock mínimo y alertas |
| 🍽️ **Catering** | Eventos, tipos de servicio (corporativo, social, desayuno), productos por carta |
| ✅ **Checklist digital** | Registro de salida (`cantidad_sale`) y retorno (`cantidad_regresa`) de materiales |
| 📊 **Cálculo automático** | Insumos por evento, pérdidas, costos extras e IGV |
| 📈 **Reportes y auditoría** | Historial de cambios (`historial`) y logs de actividad (`actividad`) |
| 📱 **Acceso móvil** | Aplicación híbrida con Ionic + Capacitor para uso en eventos |

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| **Frontend** | Ionic React | `8.5.0` |
| | React | `19.0.0` |
| | TypeScript | `5.9.0` |
| | Capacitor | `8.3.4` |
| | Vite | `5.0.0` |
| | React Router DOM | `5.3.4` |
| **Backend** | Node.js | — |
| | Express | `4.18.2` |
| | TypeScript | `5.2.2` |
| | jsonwebtoken | `9.0.2` |
| | bcryptjs | `2.4.3` |
| | helmet | `7.0.0` |
| | cors | `2.8.5` |
| **Base de datos** | MySQL | `8.0` |
| | mysql2 | `3.22.5` |
| **Pruebas** | Vitest | `0.34.6` |
| | Cypress | `13.5.0` |


---

## 🚀 Instalación y configuración

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [MySQL](https://www.mysql.com/) v8.0 o superior
- npm o yarn