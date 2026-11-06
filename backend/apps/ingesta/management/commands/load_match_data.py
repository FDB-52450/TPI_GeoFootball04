from django.core.management.base import BaseCommand

from apps.ingesta import tasks

class Command(BaseCommand):
    help = "Sincroniza partidos y datos del mismo desde la API o los archivos locales"

    def handle(self, *args, **options):
        tasks.sincronizar_partidos()

        self.stdout.write(self.style.SUCCESS("Sincronización completa"))