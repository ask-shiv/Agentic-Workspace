import sqlalchemy as sa

from alembic import op

revision = "004_source_integrity"
down_revision = "003_revisions"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("documents", sa.Column("source_sha256", sa.String(64), nullable=True))


def downgrade():
    op.drop_column("documents", "source_sha256")
