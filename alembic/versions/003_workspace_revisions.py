import sqlalchemy as sa

from alembic import op

revision = "003_revisions"
down_revision = "002_workspace"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "workspace_revisions",
        sa.Column(
            "conversation_id",
            sa.String(),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("version", sa.Integer(), primary_key=True),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.execute(
        "INSERT INTO workspace_revisions (conversation_id, version, payload) SELECT conversation_id, version, payload FROM workspaces"
    )


def downgrade():
    op.drop_table("workspace_revisions")
