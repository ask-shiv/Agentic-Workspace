import sqlalchemy as sa

from alembic import op

revision = "002_workspace"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "workspaces",
        sa.Column(
            "conversation_id",
            sa.String(),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table("workspaces")
