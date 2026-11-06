from django.core.management.base import BaseCommand

from apps.ingesta import tasks

class Command(BaseCommand):
    help = "Sincroniza confederaciones, países y competiciones desde la API o los archivos locales"

    def handle(self, *args, **options):
        tasks.sincronizar_catalogo()

        self.stdout.write(self.style.SUCCESS("Sincronización completa"))