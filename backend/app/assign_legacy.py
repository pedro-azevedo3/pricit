"""Explicit administrator-only recovery of reviewed legacy records; never a public endpoint."""
import argparse
import json
from pathlib import Path
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from .database import SessionLocal
from .models import Ingredient, Recipe, RecipeIngredient, RevenueSimulation, User


class Assignment(BaseModel):
    model_config = ConfigDict(extra='forbid')
    ingredients: list[UUID] = Field(default_factory=list, max_length=1000)
    recipes: list[UUID] = Field(default_factory=list, max_length=1000)
    simulations: list[UUID] = Field(default_factory=list, max_length=1000)


def assign_reviewed_records(db, email, assignment, *, apply=False):
    user = db.scalar(select(User).where(User.email == email.strip().lower()).with_for_update())
    if user is None:
        raise ValueError('Conta não encontrada.')
    selected = {}
    models = {'ingredients':Ingredient, 'recipes':Recipe, 'simulations':RevenueSimulation}
    if not any(getattr(assignment, name) for name in models):
        raise ValueError('Informe ao menos um registro revisado no arquivo.')
    for name, model in models.items():
        ids = set(getattr(assignment, name))
        rows = db.scalars(select(model).where(model.id.in_(ids)).order_by(model.id).with_for_update()).all()
        if len(rows) != len(ids):
            raise ValueError('O arquivo contém registros inexistentes.')
        if any(row.owner_id not in (None, user.id) for row in rows):
            raise ValueError('Não é permitido transferir registros de outra conta.')
        selected[name] = {row.id:row for row in rows}

    def intended_owner(row, group):
        return user.id if row.id in selected[group] else row.owner_id

    for recipe in selected['recipes'].values():
        for item in recipe.ingredients:
            if intended_owner(item.ingredient, 'ingredients') != user.id:
                raise ValueError('Inclua no arquivo os ingredientes legados usados pelas receitas selecionadas.')
    if selected['ingredients']:
        linked = db.scalars(select(Recipe).join(RecipeIngredient, RecipeIngredient.recipe_id == Recipe.id)
                            .where(RecipeIngredient.ingredient_id.in_(selected['ingredients']))).all()
        if any(intended_owner(recipe, 'recipes') != user.id for recipe in linked):
            raise ValueError('Há receitas vinculadas ainda sem revisão ou de outra conta. Revise o conjunto de vínculos antes de atribuir o ingrediente.')
    for simulation in selected['simulations'].values():
        if simulation.recipe_id:
            recipe = db.get(Recipe, simulation.recipe_id)
            if recipe is None or intended_owner(recipe, 'recipes') != user.id:
                raise ValueError('A receita do histórico precisa pertencer à mesma conta.')
    counts = {name:sum(row.owner_id is None for row in rows.values()) for name, rows in selected.items()}
    if apply:
        for rows in selected.values():
            for row in rows.values():
                row.owner_id = user.id
        db.flush()
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('email', help='Conta destinatária verificada pelo administrador')
    parser.add_argument('manifest', type=Path, help='JSON com IDs explicitamente revisados; nenhum registro é selecionado automaticamente')
    parser.add_argument('--apply', action='store_true', help='Aplicar a atribuição; sem esta opção apenas valida o plano')
    args = parser.parse_args()
    try:
        assignment = Assignment.model_validate_json(args.manifest.read_text())
        with SessionLocal() as db:
            counts = assign_reviewed_records(db, args.email, assignment, apply=args.apply)
            if args.apply:
                db.commit()
            else:
                db.rollback()
    except (OSError, ValidationError):
        parser.exit(1, 'Arquivo de revisão indisponível ou inválido.\n')
    except ValueError as error:
        parser.exit(1, str(error) + '\n')
    print(('Atribuição aplicada: ' if args.apply else 'Plano validado, sem alterações: ') + json.dumps(counts))


if __name__ == '__main__':
    main()
