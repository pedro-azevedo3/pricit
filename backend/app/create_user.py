"""Run with python -m app.create_user email@example.com (password is prompted)."""
import argparse
from getpass import getpass
from sqlalchemy.exc import IntegrityError
from .auth import Credentials, hash_password
from .database import SessionLocal
from .models import User


def main():
    parser = argparse.ArgumentParser(description='Criar usuário diretamente no banco do pricit.')
    parser.add_argument('email')
    args = parser.parse_args()
    try:
        password = getpass('Senha (mínimo de 12 caracteres): ')
        if password != getpass('Confirme a senha: '):
            parser.exit(1, 'As senhas não coincidem.\n')
        credentials = Credentials(email=args.email, password=password)
        encoded = hash_password(credentials.password)
    except ValueError:
        parser.exit(1, 'Informe e-mail válido e senha entre 12 e 256 caracteres.\n')
    try:
        with SessionLocal() as db:
            db.add(User(email=credentials.email, password_hash=encoded))
            db.commit()
    except IntegrityError:
        parser.exit(1, 'Já existe um usuário com esse e-mail.\n')
    print('Usuário criado. Entre em /login com o e-mail e a senha informados.')


if __name__ == '__main__':
    main()
