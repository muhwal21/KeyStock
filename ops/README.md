# Backup MySQL production

`backup-mysql.sh` membuat dump transaction-consistent, memasukkan blob foto (`--hex-blob`), mengompres dan mengenkripsinya dengan `age`, lalu mengirimnya melalui `rclone`. Salinan lokal diberi mode private dan retensi lokal default 14 hari. Script menolak jalan tanpa enkripsi dan tujuan remote yang dikonfigurasi.

## Prasyarat VPS

- Docker Compose stack KeyStock berjalan dari `/opt/keystock`.
- `age` dan `rclone` tersedia di VPS.
- `rclone config` sebagai root telah membuat remote off-site pada storage yang hanya dapat diakses akun backup.
- Simpan private identity `age` dan konfigurasi `rclone` secara terpisah dan batasi aksesnya; jangan simpan di repository atau `.env` aplikasi. Simpan age private key offline agar backup dapat dipulihkan.

## Konfigurasi systemd

Buat `/etc/keystock/backup.env` dengan izin `0600`:

```ini
BACKUP_AGE_RECIPIENT=age1REPLACE_WITH_PUBLIC_RECIPIENT
BACKUP_RCLONE_DEST=remote-keystock:backups/keystock
BACKUP_DIR=/var/backups/keystock
BACKUP_RETENTION_DAYS=14
```

`BACKUP_AGE_RECIPIENT` adalah public key enkripsi, bukan private identity. `remote-keystock` adalah nama remote yang dibuat di rclone. Jalankan sekali secara manual dari VPS untuk memeriksa bahwa dump terenkripsi berhasil sampai ke storage remote. Setelah lolos, pasang timer:

```bash
install -D -m 644 /opt/keystock/ops/systemd/keystock-backup.service /etc/systemd/system/keystock-backup.service
install -D -m 644 /opt/keystock/ops/systemd/keystock-backup.timer /etc/systemd/system/keystock-backup.timer
systemctl daemon-reload
systemctl enable --now keystock-backup.timer
systemctl list-timers keystock-backup.timer
```

Periksa hasil dan error:

```bash
systemctl start keystock-backup.service
journalctl -u keystock-backup.service -n 50 --no-pager
ls -lh /var/backups/keystock
```

## Restore drill

Jangan pulihkan dump ke database production untuk latihan. Dekripsi satu arsip memakai age private identity ke file sementara berizin `0600`, lalu import hanya ke database uji baru dengan nama terpisah. Periksa jumlah tabel dan data, kemudian hapus database uji serta file plaintext. Private identity jangan ditempel ke chat, repository, atau command line yang tersimpan di shell history.

Timer dan restore belum aktif/teruji pada VPS. Perlu dipasang dan diverifikasi dari terminal VPS setelah remote rclone, age recipient, dan private restore identity disiapkan.
